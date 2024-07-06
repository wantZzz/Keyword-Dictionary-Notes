function formatNote2GoogleDocs(tag_name, note_data, callback){
	let requests = [];
	let await_requests = [];
	let await_last_requests = [];
	const bulletsTags = ["LI", "DT", "DD"];
	
	function contentExtracter(input_node, start_index, prefix_count, is_first = false){
		let end_index = start_index;
		const is_paragraph = Boolean(bulletsTags.includes(input_node.nodeName));
		
		if (is_paragraph){
			prefix_count += 1;
		}
		
		if (input_node.nodeType === Node.ELEMENT_NODE){
			input_node.childNodes.forEach((child_node) => {
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

					requests.push(update_text_style);
					break;
				case 'STRONG':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"bold": true};
					update_text_style["updateTextStyle"]["fields"] = "bold";

					requests.push(update_text_style);
					break;
				case 'I':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"italic": true};
					update_text_style["updateTextStyle"]["fields"] = "italic";

					requests.push(update_text_style);
					break;
				case 'U':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"underline": true};
					update_text_style["updateTextStyle"]["fields"] = "underline";

					requests.push(update_text_style);
					break;
				case 'S':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"strikethrough": true};
					update_text_style["updateTextStyle"]["fields"] = "strikethrough";

					requests.push(update_text_style);
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

					requests.push(update_text_style);
					break;
					
				case 'A':
					update_text_style["updateTextStyle"]["range"] = node_range;
					update_text_style["updateTextStyle"]["textStyle"] = {"link": {"url": input_node.getAttribute('href')}};
					update_text_style["updateTextStyle"]["fields"] = "link";

					requests.push(update_text_style);
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
			
			await_requests.forEach((update_paragraph) => {
				requests.push(update_paragraph);
			})
			await_requests = [];
			
			end_index += 1;
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
