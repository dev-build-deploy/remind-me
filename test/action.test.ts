/*
 * SPDX-FileCopyrightText: 2023 Kevin de Jong <monkaii@hotmail.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IComment } from "../../comment-it/src/interfaces"
import * as action from "../src/action"

describe("Main", () => {
  test("Extract comments from a file", async () => {
    const comment = {
      type: "multiline",
      format: { start: "/*", end: "*/" },
      contents: [
        {
          line: 1,
          column: { start: 0, end: 2 },
          value: "/*",
        },
        {
          line: 2,
          column: { start: 0, end: 32 },
          value: " * @TODO: Add support for FIXMEs",
        },
        {
          line: 3,
          column: { start: 0, end: 30 },
          value: " * This is a multiline comment",
        },
        {
          line: 4,
          column: { start: 0, end: 19 },
          value: " *    with some identation",
        },
        {
          line: 5,
          column: { start: 0, end: 51 },
          value: " * @body: We need to add support for FIXME comments",
        },
        {
          line: 6,
          column: { start: 0, end: 15 },
          value: " * @labels: bug",
        },
        {
          line: 7,
          column: { start: 0, end: 28 },
          value: " * @assignees: Kevin-de-Jong",
        },
        {
          line: 8,
          column: { start: 0, end: 3 },
          value: " */",
        }
      ]
    } as IComment;

    for (const token of action.extractData(comment)) {
      console.log(token)
    }

  })
})