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
