/*
 * SPDX-FileCopyrightText: 2023 Kevin de Jong <monkaii@hotmail.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as commentIt from "@dev-build-deploy/comment-it";

async function getSupportedFiles() {
  const octokit = github.getOctokit(core.getInput("token"));
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...github.context.repo,
    pull_number: github.context.issue.number,
  });

  /*
   * @TODO: Extend the list of supported files
   * @body: We need to contribute to comment-it for supporting additional file formats
   * @labels: enhancement
   * @assignees: Kevin-de-Jong
   */
  return files.filter(files => files.status != "removed").filter(file => commentIt.isSupported(file.filename));
}

const tokenRefs = {
  todo: "@TODO",
  body: "@body",
  labels: "@labels",
  assignees: "@assignees",
  milestones: "@milestones",
} as const;

type Token = {
  start: number;
  end: number;
  type: keyof typeof tokenRefs;
};

function generateToken(line: string): Token | undefined {
  const tokens = {
    todo: new RegExp(`@${tokenRefs.todo}:`, "i"),
    body: new RegExp(`@${tokenRefs.body}:`, "i"),
    labels: new RegExp(`@${tokenRefs.labels}:`, "i"),
    assignees: new RegExp(`@${tokenRefs.assignees}:`, "i"),
    milestones: new RegExp(`@${tokenRefs.milestones}:`, "i"),
  };
  const tokenKeys = Object.keys(tokens) as (keyof typeof tokens)[];
  for (let i = 0; i < tokenKeys.length; i++) {
    const match = tokens[tokenKeys[i]].exec(line);
    if (match === null) continue;

    return {
      start: match.index,
      end: line.indexOf(":") + 1,
      type: Object.keys(tokenRefs)[i] as keyof typeof tokenRefs,
    };
  }
}

export function* extractData(comment: commentIt.IComment) {
  let currentToken: Token | undefined = undefined;
  let currentData = "";

  for (const line of comment.contents) {
    const match = generateToken(line.value);
    if (match) {
      if (currentToken) {
        yield { type: currentToken.type, data: currentData };
      }

      currentToken = match;
      currentData = line.value.substring(currentToken.end).trim();
    } else if (line.value.substring(currentToken?.start ?? 0).length > 0) {
      currentData += `\n${line.value.substring(currentToken?.start ?? 0)}`;
    }
  }

  if (currentToken) {
    yield { type: currentToken.type, data: currentData };
  }
}

/*
 * GitHub Actions entrypoint for updating GitHub Issues
 * @internal
 */
export async function run(): Promise<void> {
  try {
    core.info("📄 RemindMe - Track TODOs and FIXMEs as GitHub Issues");
    const files = await getSupportedFiles();

    files.forEach(async file => {
      for await (const comment of commentIt.extractComments(file.filename)) {
        core.info(JSON.stringify(comment, null, 2));
        const issue = {
          ...github.context.repo,
          title: "",
          body: "",
        };
        /*
         * @TODO: Add support for FIXMEs
         * @body: We need to add support for FIXME comments
         * @labels: bug
         * @assignees: Kevin-de-Jong
         */
        for (const token of extractData(comment)) {
          console.log(token)
          switch (token.type) {
            case "todo":
              issue.title = token.data;
              break;
            case "body":
              issue.body = token.data;
              break;
          }
        }
        if (issue.title.length > 0) {
          const octokit = github.getOctokit(core.getInput("token"));
          await octokit.rest.issues.create({
            ...github.context.repo,
            ...issue,
          });
        }
      }
    });
  } catch (ex) {
    core.setFailed((ex as Error).message);
  }
}
