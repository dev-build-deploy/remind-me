/*
 * SPDX-FileCopyrightText: 2023 Kevin de Jong <monkaii@hotmail.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as commentIt from "@dev-build-deploy/comment-it";
import type { components as octokitComponents } from "@octokit/openapi-types";
import { createIssue, getMatchingIssue } from "./issue";

type Issue = octokitComponents["schemas"]["issue"];

async function listIssues(): Promise<Issue[]> {
  const octokit = github.getOctokit(core.getInput("token"));
  const issues: Issue[] = [];

  for await (const page of octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
    ...github.context.repo,
    labels: "TODO",
  })) {
    for (const issue of page.data) {
      issues.push({ ...issue, state_reason: undefined });
    }
  }

  console.log(issues)

  return issues;
}

/**
 * Lists all files in the current Pull Request and filters out unsupported files.
 * @returns List of supported files
 */
async function getSupportedFiles() {
  const octokit = github.getOctokit(core.getInput("token"));
  const {data: commits} = await octokit.rest.repos.listCommits({
    ...github.context.repo,
    sha: github.context.payload.before
  });

  let allFiles: any[] = [];
  for (const commit of commits) {
    const {data: details} = await octokit.rest.repos.getCommit({
      ...github.context.repo,
      ref: commit.sha
    })
    allFiles = allFiles.concat(details.files);
  }

  /*
   * @TODO: Extend the list of supported files
   * @body: We need to contribute to comment-it for supporting additional file formats
   * @labels: enhancement
   * @assignees: Kevin-de-Jong
   */
  return allFiles.filter(files => files.status != "removed").filter(file => commentIt.isSupported(file.filename));
}

/**
 * Supported tokens
 * @internal
 */
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

const tokenRegex = {
  todo: new RegExp(`${tokenRefs.todo}:`, "i"),
  body: new RegExp(`${tokenRefs.body}:`, "i"),
  labels: new RegExp(`${tokenRefs.labels}:`, "i"),
  assignees: new RegExp(`${tokenRefs.assignees}:`, "i"),
  milestones: new RegExp(`${tokenRefs.milestones}:`, "i"),
};

/**
 * Generates a token from the provided line
 * @param line The line to generate a token from
 * @returns The generated token
 */
function generateToken(line: string): Token | undefined {
  const tokenKeys = Object.keys(tokenRegex) as (keyof typeof tokenRegex)[];
  for (let i = 0; i < tokenKeys.length; i++) {
    const match = tokenRegex[tokenKeys[i]].exec(line);
    if (match === null) continue;

    return {
      start: match.index,
      end: line.indexOf(":") + 1,
      type: Object.keys(tokenRefs)[i] as keyof typeof tokenRefs,
    };
  }
}

/**
 * Extracts the data from the provided comment
 * @param comment The comment to extract the data from
 * @internal
 */
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
    console.log(JSON.stringify(github.context.payload, null, 2))
    
    const issues = await listIssues();
    const files = await getSupportedFiles();

    files.forEach(async file => {
      for await (const comment of commentIt.extractComments(file.filename)) {
        core.info(JSON.stringify(comment, null, 2));
        const issue = {
          ...github.context.repo,
          title: "",
          body: "",
          labels: ["TODO"],
        };
        /*
         * @TODO: Add support for FIXMEs
         * @body: We need to add support for FIXME comments
         * @labels: bug
         * @assignees: Kevin-de-Jong
         */
        for (const token of extractData(comment)) {
          switch (token.type) {
            case "todo":
              issue.title = token.data;
              break;
            case "body":
              issue.body = createIssue(file.filename, token.data);
              break;
          }
        }

        if (issue.title.length > 0) {
          const octokit = github.getOctokit(core.getInput("token"));
          const match = getMatchingIssue(issues, file.filename, issue.title);
          if (match) {
            core.info("Updating existing issue...");
            await octokit.rest.issues.update({ issue_number: match.number, ...github.context.repo, ...issue });
          } else {
            core.info("Creating new issue...");
            await octokit.rest.issues.create({ ...github.context.repo, ...issue });
          }
        }
      }
    });
  } catch (ex) {
    core.setFailed((ex as Error).message);
  }
}
