//---- background ----
export function newNoteGoogleDocs(title, token, callback){
	const new_docs_data = {
		title: title
	};
	
	fetch("https://docs.googleapis.com/v1/documents", {
		method: "POST",
		headers: new Headers({'Authorization': `Bearer ${token}`}),
		body: JSON.stringify(new_docs_data)
	}).then((request) => {
		return request.json();
	}).then((docs_info) => {
		callback(docs_info.documentId);
	});
}

function doneAwaitRequests(requests_await_requests, token, document_id){
	const image_quest = requests_await_requests.pop();
	
	if (Boolean(image_quest)){
		const image_update_content = {
			"requests": [image_quest]
		};
		
		fetch(`https://docs.googleapis.com/v1/documents/${document_id}:batchUpdate`, {
			method: "POST",
			headers: new Headers({'Authorization': `Bearer ${token}`}),
			body: JSON.stringify(image_update_content)
		})
		.then((request) => {
			return request.json();
		})
		.then((data) => {
			if (!Boolean(data.error)){
				doneAwaitRequests(requests_await_requests, token, document_id);
			}
			else{
				errorAwaitRequests(image_quest, requests_await_requests, token, document_id);
			}
		});
	}
}

function errorAwaitRequests(error_requests, requests_await_requests, token, document_id){
	const start_index = error_requests["insertInlineImage"]["location"]["index"];
	const image_update_error = {
		"requests": [
			{
				"insertText": {
					"location": error_requests["insertInlineImage"]["location"],
					"text": `[ 無法取得此圖片 ]`
				}
			},
			{
				"updateTextStyle": {
					"range": {
						"startIndex": (start_index + 2),
						"endIndex": (start_index + 9)
					},
					"textStyle": {
						"link": {
							"url": error_requests["insertInlineImage"]["uri"]
						}
					},
					"fields": "link"
				}
			}
		]
	};
	
	fetch(`https://docs.googleapis.com/v1/documents/${document_id}:batchUpdate`, {
		method: "POST",
		headers: new Headers({'Authorization': `Bearer ${token}`}),
		body: JSON.stringify(image_update_error)
	})
	.then((request) => {
		return request.json();
	})
	.then((docs_info) => {
		doneAwaitRequests(requests_await_requests, token, document_id);
	});
}

export function remitNoteGoogleDocs(tag_name, requests_json, requests_await_requests, is_sucess, token, callback){
	if (is_sucess){
		const update_content = {
			"requests": requests_json
		};
		
		newNoteGoogleDocs(`${tag_name} - export from KDN testing`, token, (document_id) => {
			fetch(`https://docs.googleapis.com/v1/documents/${document_id}:batchUpdate`, {
				method: "POST",
				headers: new Headers({'Authorization': `Bearer ${token}`}),
				body: JSON.stringify(update_content)
			}).then((request) => {
				return request.json();
			}).then((docs_info) => {
				console.log(docs_info);
			}).then(() => {
				const update_content = {
					"requests": requests_json
				};
				
				doneAwaitRequests(requests_await_requests, token, document_id);
			});
		});
	}
	else{
		console.log('error');
		callback();
	}
}

//---- setting ----
export function formatNote2GoogleDocs(tag_name, note_data, callback){
	let requests = [];
	let await_requests = [];
	let await_last_requests = [];
	const bulletsTags = ["LI", "DT", "DD"];
	const inlineTags = ["B", "STRONG", "I", "U", "S", "MARK", "A", "#text"];
	
	function contentExtracter(input_node, start_index, prefix_count, is_first = false){
		let end_index = start_index;
		let is_paragraph = Boolean(bulletsTags.includes(input_node.nodeName));
		let has_mutiple = false;
		
		if (is_paragraph){
			prefix_count += 1;
		}
		
		if (input_node.nodeName === 'TABLE'){
			end_index = insertTable(input_node, start_index);
		}
		else if (input_node.nodeType === Node.ELEMENT_NODE){
			input_node.childNodes.forEach((child_node) => {
				if ((child_node.nodeName == 'OL' || child_node.nodeName == 'UL') && (prefix_count > -1)){
					const paragraph_inserttext = {
						"insertText": {
							"location": {
								"index": end_index,
								"segmentId": ""
							},
							"text": "\n"
						}
					};
					requests.push(paragraph_inserttext);
					
					end_index += 1;
					has_mutiple = true;
				}
				end_index = contentExtracter(child_node, end_index, prefix_count);
			});
			
			const node_range = {
				"startIndex": start_index,
				"endIndex": end_index
			};
			let update_paragraph_style = {
				"updateParagraphStyle": {
					"range": {},
					"paragraphStyle": {},
					"fields": ""
				}
			};
			let update_text_style = {
				"updateTextStyle": {
					"range": {},
					"textStyle": {},
					"fields": ""
				}
			};
			let update_paragraph_bullet = {
				"createParagraphBullets": {
					"range": {},
					"bulletPreset": ""
				}
			}
			
			switch(input_node.nodeName){
				case 'H1':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_1"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
				case 'H2':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_2"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
				case 'H3':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_3"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
				case 'H4':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_4"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
				case 'H5':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_5"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
				case 'H6':
					update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
					update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"namedStyleType": "HEADING_6"};
					update_paragraph_style["updateParagraphStyle"]["fields"] = "namedStyleType";

					await_requests.push(update_paragraph_style);
					break;
					
				case 'B':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"bold": true};
					update_text_style["updateTextStyle"]["fields"] = "bold";

					await_requests.push(update_text_style);
					break;
				case 'STRONG':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"bold": true};
					update_text_style["updateTextStyle"]["fields"] = "bold";

					await_requests.push(update_text_style);
					break;
				case 'I':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"italic": true};
					update_text_style["updateTextStyle"]["fields"] = "italic";

					await_requests.push(update_text_style);
					break;
				case 'U':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"underline": true};
					update_text_style["updateTextStyle"]["fields"] = "underline";

					await_requests.push(update_text_style);
					break;
				case 'S':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"strikethrough": true};
					update_text_style["updateTextStyle"]["fields"] = "strikethrough";

					await_requests.push(update_text_style);
					break;
				case 'MARK':
					let color_output = {
						"red": 1,
						"green": 1,
						"blue": 1
					};
					let field_name = "backgroundColor";
					
					if (input_node.classList.contains('marker-yellow')){
						color_output["blue"] = 0;
					}
					else if (input_node.classList.contains('marker-green')){
						color_output["red"] = 98 / 255;
						color_output["green"] = 249 / 255;
						color_output["blue"] = 98 / 255;
					}
					else if (input_node.classList.contains('marker-pink')){
						color_output["red"] = 252 / 255;
						color_output["green"] = 120 / 255;
						color_output["blue"] = 153 / 255;
					}
					else if (input_node.classList.contains('marker-blue')){
						color_output["red"] = 114 / 255;
						color_output["green"] = 204 / 255;
						color_output["blue"] = 253 / 255;
					}
					else if (input_node.classList.contains('pen-red')){
						color_output["red"] = 231 / 255;
						color_output["green"] = 19 / 255;
						color_output["blue"] = 19 / 255;
						field_name = "foregroundColor";
					}
					else if (input_node.classList.contains('pen-green')){
						color_output["red"] = 18 / 255;
						color_output["green"] = 138 / 255;
						color_output["blue"] = 0;
						field_name = "foregroundColor";
					}
				
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {[field_name]: {"color": {"rgbColor": color_output}}};
					update_text_style["updateTextStyle"]["fields"] = field_name;

					await_requests.push(update_text_style);
					break;
					
				case 'A':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"link": {"url": input_node.getAttribute('href')}};
					update_text_style["updateTextStyle"]["fields"] = "link";

					await_requests.push(update_text_style);
					break;
					
				case 'OL':
					update_paragraph_bullet["createParagraphBullets"]["range"] = node_range;
					update_paragraph_bullet["createParagraphBullets"]["bulletPreset"] = "NUMBERED_DECIMAL_ALPHA_ROMAN";

					requests.push(update_paragraph_bullet);
					break;
				case 'UL':
					update_paragraph_bullet["createParagraphBullets"]["range"] = node_range;
					update_paragraph_bullet["createParagraphBullets"]["bulletPreset"] = "BULLET_DISC_CIRCLE_SQUARE";

					requests.push(update_paragraph_bullet);
					break;
					
				case 'IMG':
					insertInlineImage(input_node, start_index);
			}
			
			if (input_node.style.textAlign != ""){
				switch(input_node.style.textAlign){
					case 'left':
						update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
						update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"alignment": "START"};
						update_paragraph_style["updateParagraphStyle"]["fields"] = "alignment";

						await_requests.push(update_paragraph_style);
						break;
					case 'right':
						update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
						update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"alignment": "END"};
						update_paragraph_style["updateParagraphStyle"]["fields"] = "alignment";

						await_requests.push(update_paragraph_style);
						break;
					case 'center':
						update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
						update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"alignment": "CENTER"};
						update_paragraph_style["updateParagraphStyle"]["fields"] = "alignment";

						await_requests.push(update_paragraph_style);
						break;
					case 'justify':
						update_paragraph_style["updateParagraphStyle"]["range"] = node_range;
						update_paragraph_style["updateParagraphStyle"]["paragraphStyle"] = {"alignment": "JUSTIFIED"};
						update_paragraph_style["updateParagraphStyle"]["fields"] = "alignment";

						await_requests.push(update_paragraph_style);
						break;
				}
			}
		}
		else if (input_node.nodeType === Node.TEXT_NODE){
			const prefix = (prefix_count > 0) ? "\t".repeat(prefix_count) : "";
			const node_content = `${prefix}${input_node.textContent}`;
			end_index += node_content.length;
			
			const inserttext = {
				"insertText": {
					"location": {
						"index": start_index,
						"segmentId": ""
					},
					"text": node_content
				}
			};
			
			requests.push(inserttext);
		}
		
		if (is_paragraph || is_first){
			if (!has_mutiple){
				const paragraph_inserttext = {
					"insertText": {
						"location": {
							"index": end_index,
							"segmentId": ""
						},
						"text": "\n"
					}
				};
				
				requests.push(paragraph_inserttext);
				end_index += 1;
			}
			
			await_requests.forEach((update_paragraph) => {
				requests.push(update_paragraph);
			})
			await_requests = [];
		}

		console.log(input_node.nodeName, is_paragraph)
		return end_index;
	}
	
	function insertInlineImage(input_node, start_index){
		let update_image = {
			"insertInlineImage": {
				"location": {
				  "index": start_index
				},
				"uri": ""
			}
		}
		
		update_image["insertInlineImage"]["uri"] = input_node.getAttribute('src');
			
		await_last_requests.push(update_image);
	}
	
	function insertTable(input_node, start_index){
		let end_index = start_index;
		
		let table_col = 0;
		let table_row = 0;
		let table_await_requests = [];
		
		const requests_table_insert = requests.length;
		
		const row_nodes = input_node.querySelectorAll('tbody tr');
		table_row = row_nodes.length;
		
		row_nodes[0].querySelectorAll('td').forEach((col_node) => {
			table_col += Boolean(col_node.getAttribute('colspan')) ? parseInt(col_node.getAttribute('colspan')) : 1;
		});
		
		let table_index_jumper = new Array(table_row * table_col).fill(true);
		let table_index_pointer = 0;
		
		end_index += 4;
		let row_counter = 0;
		for (let row_index = 0; row_index < row_nodes.length; row_index++){
			const row_node = row_nodes[row_index];
			const col_nodes = row_node.querySelectorAll('td');
			
			for (let col_index = 0; col_index < col_nodes.length; col_index++){
				const col_node = col_nodes[col_index];
				const nodes_in_col = col_node.childNodes;
				
				while(!table_index_jumper[table_index_pointer]){
					end_index += 2;
					table_index_pointer += 1;
				}
				
				const insert_col_delimiter = {
					"insertText": {
						"location": {
							"index": end_index
						},
						"text": '@'
					}
				};
				requests.push(insert_col_delimiter);
				
				let is_previous_inline = inlineTags.includes(nodes_in_col[0].nodeName);
				for (let i = 0; i < nodes_in_col.length; i++){
					let need_newline = true;
					if (Boolean(nodes_in_col[i + 1])){
						const is_next_inline = inlineTags.includes(nodes_in_col[i + 1].nodeName);
						need_newline = !(is_previous_inline && is_next_inline);
						
						is_previous_inline = is_next_inline;
					}
					else{
						need_newline = false;
					}

					end_index = contentExtracter(nodes_in_col[i], end_index, -1, need_newline);
				}
				
				const remove_col_delimiter = {
					"deleteContentRange": {
						"range": {
							"startIndex": end_index,
							"endIndex": end_index + 1
						}
					}
				};
				requests.push(remove_col_delimiter);
				
				if (col_node.getAttribute('colspan') || col_node.getAttribute('rowspan')){
					const rowspan = Boolean(col_node.getAttribute('rowspan')) ? parseInt(col_node.getAttribute('rowspan')) : 1;
					const colspan = Boolean(col_node.getAttribute('colspan')) ? parseInt(col_node.getAttribute('colspan')) : 1;
					
					for (let i = 1; i <= rowspan; i++){
						for (let j = 1; j <= colspan; j++){
							table_index_jumper[table_index_pointer + ((i - 1) * table_col) + (j - 1)] = false;
						}
					}
					
					const insert_col_delimiter = {
						"mergeTableCells": {
							"tableRange": {
								"tableCellLocation": {
									"tableStartLocation": {
										"index": start_index + 1
									},
									"rowIndex": Math.floor(table_index_pointer / table_col),
									"columnIndex": table_index_pointer % table_col
								},
								"rowSpan": rowspan,
								"columnSpan": colspan
							}
						}
					};
					
					table_await_requests.push(insert_col_delimiter);
				}
				
				end_index += 2;
				table_index_pointer += 1;
			}
			end_index += 1;
		}
		
		await_requests.forEach((update_paragraph) => {
			requests.push(update_paragraph);
		});
		table_await_requests.forEach((update_table) => {
			requests.push(update_table);
		});
		await_requests = [];
		
		let insert_table = {
			"insertTable":{
				"location": {
					"index": start_index
				},
				"columns": table_col,
				"rows": table_row
			}
		};
		
		requests.splice(requests_table_insert, 0, insert_table);
		
		return (end_index - 1);
	}
	
	let note_contaner = document.createElement('div');
	let start_index = 1;
	
	const insert_title = {
		"insertText": {
			"location": {
				"index": start_index,
				"segmentId": ""
			},
			"text": `${tag_name}\n`
		}
	};
	const insert_title_style = {
		"updateParagraphStyle": {
			"range": {
				"startIndex": start_index,
				"endIndex": (start_index + tag_name.length)
			},
			"paragraphStyle": {
				"namedStyleType": "TITLE"
			},
			"fields": "namedStyleType"
		}
	};
	const insert_title_enter = {
		"insertText": {
			"location": {
				"index": (start_index + tag_name.length + 1),
				"segmentId": ""
			},
			"text": '\n@'
		}
	};
	requests.push(insert_title);
	requests.push(insert_title_style);
	requests.push(insert_title_enter);
	
	start_index += (tag_name.length + 2);
	
	note_data.forEach((note_data) => {
		const [note_content, note_timestamp, undefind_value] = note_data;
		
		note_contaner.innerHTML = note_content;
		
		note_contaner.childNodes.forEach((child_node) => {
			start_index = contentExtracter(child_node, start_index, -1, true);
		});
		
		const end_index = note_timestamp.length + start_index + 3;
		const inserttext = {
			"insertText": {
				"location": {
					"index": start_index,
					"segmentId": ""
				},
				"text": `\n${note_timestamp}\n\n`
			}
		};
		const update_paragraph_style = {
			"updateParagraphStyle": {
				"range": {
					"startIndex": (start_index + 1),
					"endIndex": (end_index - 3)
				},
				"paragraphStyle": {
					"alignment": "END"
				},
				"fields": "alignment"
			}
		};
		requests.push(inserttext);
		requests.push(update_paragraph_style);
		
		start_index = end_index;
	});
	
	callback(requests, await_last_requests, true);
}
