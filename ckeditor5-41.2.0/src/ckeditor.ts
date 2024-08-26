/**
 * @license Copyright (c) 2014-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import { BalloonEditor } from '@ckeditor/ckeditor5-editor-balloon';
import { BlockToolbar } from '@ckeditor/ckeditor5-ui';
import type { EditorConfig } from '@ckeditor/ckeditor5-core';

import AccessibilityHelp from '@ckeditor/ckeditor5-ui/src/editorui/accessibilityhelp/accessibilityhelp';
import AutoLink from '@ckeditor/ckeditor5-link/src/autolink';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import CodeBlock from '@ckeditor/ckeditor5-code-block/src/codeblock';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Highlight from '@ckeditor/ckeditor5-highlight/src/highlight';
import { Image, ImageResize, ImageInsertViaUrl } from '@ckeditor/ckeditor5-image';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import { Table, TableCaption, TableColumnResize, TableToolbar } from '@ckeditor/ckeditor5-table';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import Underline from "@ckeditor/ckeditor5-basic-styles/src/underline";
import TodoList from "@ckeditor/ckeditor5-list/src/todolist";

// You can read more about extending the build with additional plugins in the "Installing plugins" guide.
// See https://ckeditor.com/docs/ckeditor5/latest/installation/plugins/installing-plugins.html for details.

class Editor extends BalloonEditor {
	public static override builtinPlugins = [
		AccessibilityHelp,
    AutoLink,
    Bold,
    BlockToolbar,
    CodeBlock,
    Essentials,
    Heading,
    Highlight,
    Image,
    ImageInsertViaUrl,
    ImageResize,
    Italic,
    Link,
    List,
    Paragraph,
    Table,
    TableToolbar,
    TableCaption,
    TableColumnResize,
    TodoList,
    Undo,
    Underline,
	];

	public static override defaultConfig: EditorConfig = {
		toolbar: {
			items: [
        'bold',
        'italic',
        'underline',
        'highlight',
        'link',
        '|',
        'undo',
        'redo',
        '|',
        'bulletedList',
        'numberedList',
        'todoList',
        '|',
        'heading',
        '|',
        'accessibilityHelp'
      ]
		},
    blockToolbar: [
      'insertImage',
      'codeBlock',
      'insertTable'
    ],
		language: 'zh',
		table: {
			contentToolbar: [
				'tableColumn',
				'tableRow',
				'mergeTableCells'
			]
		}
	};
}

export default Editor;
