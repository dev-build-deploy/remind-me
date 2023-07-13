/*
 * SPDX-FileCopyrightText: 2023 Kevin de Jong <monkaii@hotmail.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IComment } from "../../comment-it/src/interfaces"
import * as action from "../src/action"
import { createIssue } from "../src/issue";

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

    const expectations = [
      {
        type: 'todo',
        data: 'Add support for FIXMEs\n' +
          'This is a multiline comment\n' +
          '   with some identation'
      },
      { type: 'body', data: 'We need to add support for FIXME comments' },
      { type: 'labels', data: 'bug' },
      { type: 'assignees', data: 'Kevin-de-Jong' }
    ]

    expect([...action.extractData(comment)]).toEqual(expectations)
  })

  test("Multiline body with formatting", async () => {
    const comment = {
        "type": "multiline",
        "format": {
          "start": "<!--",
          "end": "-->"
        },
        "contents": [
          {
            "line": 11,
            "column": {
              "start": 0,
              "end": 4
            },
            "value": "<!--"
          },
          {
            "line": 12,
            "column": {
              "start": 0,
              "end": 24
            },
            "value": "@TODO: Validate RemindMe"
          },
          {
            "line": 13,
            "column": {
              "start": 0,
              "end": 91
            },
            "value": "@body: RemindMe is still under heavy development and is, therefore, not behaving optimally."
          },
          {
            "line": 14,
            "column": {
              "start": 0,
              "end": 89
            },
            "value": "As an example, only a few file formats are supported and it does not handle issue states;"
          },
          {
            "line": 15,
            "column": {
              "start": 0,
              "end": 0
            },
            "value": ""
          },
          {
            "line": 16,
            "column": {
              "start": 0,
              "end": 15
            },
            "value": "* Updating body"
          },
          {
            "line": 17,
            "column": {
              "start": 0,
              "end": 32
            },
            "value": "* Managing labels and milestones"
          },
          {
            "line": 18,
            "column": {
              "start": 0,
              "end": 3
            },
            "value": "-->"
          }
        ]
      }  as IComment;

      const data = [...action.extractData(comment)]
      console.log(createIssue("woep", data[1].data));
      expect(true).toBe(false)
  })
})