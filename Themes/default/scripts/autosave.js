/**
 * SCEditor AutoSave Plugin
 * http://www.sceditor.com/
 *
 * Copyright (C) 2017, Sam Clarke (samclarke.com)
 *
 * SCEditor is licensed under the MIT license:
 *	http://www.opensource.org/licenses/mit-license.php
 *
 * @author Sam Clarke
 */
(function (sceditor) {
	'use strict';

	const defaultKey = 'sce-autodraft-' + location.search;
	const storageKeys = new Set();

	function editorStorageKey(editorId, search) {
		return 'sce-autodraft-' + JSON.stringify([
			location.pathname,
			search === undefined ? location.search : search,
			editorId
		]);
	}

	function clear(key) {
		if (key) {
			localStorage.removeItem(key);
		} else {
			storageKeys.forEach(function (storageKey) {
				localStorage.removeItem(storageKey);
			});
			localStorage.removeItem(defaultKey);
		}
	}

	function read(key) {
		try {
			return JSON.parse(localStorage.getItem(key));
		} catch (error) {
			return null;
		}
	}

	sceditor.plugins.autosave = function () {
		const base = this;
		let editor;
		let textarea;
		let isLoading = false;
		let storageKey = defaultKey;
		// 86400000 = 24 hrs (24 * 60 * 60 * 1000)
		let expires = 86400000;
		let saveHandler = function (value) {
			localStorage.setItem(storageKey, JSON.stringify(value));

			const isTopicMatch = /^\?topic=\d+\.\d+$/.test(location.search);

			if (isTopicMatch && textarea.form && textarea.form.id === 'postmodify'
				&& (textarea.id === 'message' || textarea.id === 'quickReply')) {
				const form = textarea.form;
				const match = form.action.match(/board=(\d+)/);
				const boardValue = match ? match[1] : null;

				boardValue && clear(editorStorageKey('message', '?board=' + boardValue + ';action=post2'));
			}
		};
		let loadHandler = function () {
			return read(storageKey);
		};

		function gc() {
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const key = localStorage.key(i);

				if (/^sce\-autodraft\-/.test(key)) {
					const item = read(key);

					if (item && item.time < Date.now() - expires) {
						clear(key);
					}
				}
			}
		}

		base.init = function () {
			editor = this;
			const opts = editor.opts && editor.opts.autosave || {};
			const textareas = Array.from(document.querySelectorAll('textarea')).filter(function (element) {
				return !element.closest('.sceditor-container');
			});
			textarea = textareas.find(function (element) {
				return sceditor.instance(element) === editor;
			});
			const editorId = textarea.id || (textarea.name || 'textarea') + ':' + textareas.indexOf(textarea);

			saveHandler = opts.save || saveHandler;
			loadHandler = opts.load || loadHandler;
			storageKey = opts.storageKey || editorStorageKey(editorId);
			storageKeys.add(storageKey);
			expires = opts.expires || expires;

			gc();
		};

		base.signalReady = function () {
			// Add submit event listener to clear autosave
			let parent = editor.getContentAreaContainer();
			while (parent) {
				if (/form/i.test(parent.nodeName)) {
					parent.addEventListener(
						'submit', clear.bind(null, storageKey), true
					);
					break;
				}

				parent = parent.parentNode;
			}

			const state = loadHandler();
			if (state) {
				isLoading = true;
				editor.sourceMode(state.sourceMode);
				editor.val(state.value, false);
				//editor.focus();

				if (state.sourceMode) {
					///editor.sourceEditorCaret(state.caret);
				} else {
					//editor.getRangeHelper().restoreRange();
				}
				isLoading = false;
			} else {
				saveHandler({
					caret: this.sourceEditorCaret(),
					sourceMode: this.sourceMode(),
					value: editor.val(null, false),
					time: Date.now()
				});
			}
		};

		base.signalValuechangedEvent = function (e) {
			if (!isLoading) {
				saveHandler({
					caret: this.sourceEditorCaret(),
					sourceMode: this.sourceMode(),
					value: e.detail.rawValue,
					time: Date.now()
				});
			}
		};
	};

	sceditor.plugins.autosave.clear = clear;
}(sceditor));
