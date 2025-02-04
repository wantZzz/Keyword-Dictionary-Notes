function vC(e) {
  function t(r, o) {
    return [
      r.id,
      JSON.stringify(r.args),
      null,
      o > 0 ? o.toString() : "generic",
    ];
  }
  if (e.length === 1) return [t(e[0], 0)];
  const n = [];
  for (let r = 0; r < e.length; r++) n.push(t(e[r], r + 1));
  return n;
}
function generateNotebooklmUrl(rpcs){
	const baseUrl_info = {
		  host: "notebooklm.google.com",
		  app: "LabsTailwindUi"
		}
		
	const fullUrl = new URL(`https://${baseUrl_info.host}/_/${baseUrl_info.app}/data/batchexecute`);
	
	fullUrl.searchParams.append("rpcids", rpcs.map((o) => o.id).join(","));
	
	const reqid = Math.floor(Math.random() * 9e5) + 1e5;
	fullUrl.searchParams.append("_reqid", reqid.toString());
	
	const n = new Headers({
	  "content-type": "application/x-www-form-urlencoded;charset=utf-8",
	});
	
	const r = new URLSearchParams({ "f.req": JSON.stringify([vC(rpcs)])});
	
	return {url: fullUrl, headers: n, body: r};
}

const dC = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const fC = new Set([101, 204, 205, 304]);
const tidy_types = new Set(["faq", "notebook_guide_study_guide", "briefing_doc", "timeline"]);
function aC(contentType) {
    if (contentType && contentType.startsWith('application/json')) {
        return 'json'
    }
  
    if(contentType && contentType.startsWith('text')) {
      return 'text'
    }
  
	if(contentType && contentType.startsWith('blob')) {
		return 'blob'
	}
  
    if(contentType && contentType.startsWith('arrayBuffer')){
        return 'arrayBuffer'
    }
  
	return 'json'
}
async function fetchRequest(url, requestOptions) {
	const fetchFn = requestOptions.fetch || globalThis.fetch;
	const Headers = requestOptions.Headers || globalThis.Headers;
	const AbortController = requestOptions.AbortController || globalThis.AbortController;

	const {
		method = 'GET',
		headers = {},
		body,
		retry = 1,
		retryStatusCodes,
		timeout,
		onSuccess,
		onError,
		parseResponse,
		responseType,
		ignoreResponseError
	} = requestOptions;

    let retryCount = 0;
    while (retryCount <= retry) {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchOptions = {
            method,
            headers: new Headers(headers),
            body,
            signal
        };

		if (timeout) {
			setTimeout(() => {
				controller.abort();
			}, timeout);
		}

		try {
            const response = await fetch(url, fetchOptions);
            const status = response.status;

            // 根據 responseType 處理響應數據
            let responseData;
            const contentType = response.headers.get('content-type');
            let resolvedResponseType = responseType;
            
            if(parseResponse){
              resolvedResponseType = 'json'
            } else if (!resolvedResponseType) {
              resolvedResponseType = aC(contentType)
            }
            
            if (resolvedResponseType === 'json') {
                try {
					const text = await response.text();
                    responseData = JSON.parse(text);
                } catch (e) {
                    // 如果解析 JSON 失敗，則拋出錯誤
					console.error('JSON parse error', e)
					throw e
                }
                
            } else if (resolvedResponseType === 'stream') {
				responseData = response.body
            } else if (resolvedResponseType){
                responseData = await response[resolvedResponseType]();
            }

           // 檢查是否為成功的狀態碼，如果不是，且設定 ignoreResponseError 為 true，則直接返回 responseData
            if (status >= 200 && status < 300 ) {
				if (onSuccess) {
					onSuccess(responseData, response);
				}
				return responseData;
            }

            if(ignoreResponseError){
            	if (onSuccess) {
					onSuccess(responseData, response);
				}
				return responseData;
			}
            
			if (fC.has(status)) {
				if(onError){
					onError(responseData, response);
				}
				return responseData;
			}
            
            if (retryCount < retry &&
                (Array.isArray(retryStatusCodes)
                    ? retryStatusCodes.includes(status)
                    : dC.has(status))) {
                retryCount++;
                await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
                continue;
            }

            if (onError) {
                onError(responseData, response);
            }
            return responseData;

        } catch (error) {
			if(error.name === 'AbortError' && !timeout) {
				throw error;
			}
			if (retryCount < retry) {
				retryCount++;
				await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
				continue;
			}
			throw error;
        }
    }
}

function wC(e) {
	const t = e.split(`
`).slice(2).join(""),
	n = JSON.parse(t),
	r = [];
	for (const o of n) {
		if (o[0] !== "wrb.fr") continue;
		let i;
		o[6] === "generic" ? (i = 1) : (i = parseInt(o[6], 10));
		const s = o[1],
		l = JSON.parse(o[2]);
		r.push({ index: i, rpcId: s, data: l });
	}
	
	return r;
}
class notebooklmInteractiveControl {
	constructor(authParams, authuser){
		this.authParams = authParams;
		this.authuser = authuser;
	}
	
	static async create(authuser = 0){
		const response_text = await fetchRequest(`https://notebooklm.google.com/?authuser=${authuser}`, {
				responseType: "text",
				headers: {
					"content-type": "application/x-www-form-urlencoded;charset=utf-8"
			}});
			
		function extractValueByKey(e, t) {
			const r = new RegExp(`"${e}":"([^"]+)"`).exec(t);
			return r == null ? void 0 : r[1];
		}
		
		const n = extractValueByKey("SNlM0e", response_text);
		const r = extractValueByKey("cfb2h", response_text);
		
		if (!n || !r){
			throw new Error("Please sign-in to your Google account to use NotebookLM");
		}
		else{
			return new notebooklmInteractiveControl({ at: n, bl: r }, authuser);
		}
	}
	
	changeAuthUser(authuser){
		this.authuser = authuser;
	}
	
	async execute(rpcs){
		let url_info = await generateNotebooklmUrl(rpcs);
			
		url_info.url.searchParams.append("bl", this.authParams.bl);
		url_info.body.append("at", this.authParams.at);
		
		if (this.authuser > 0){
			url_info.url.searchParams.append("authuser", this.authuser);
		}
			
		const response_text = await fetchRequest(url_info.url.toString(), {
			method: "POST",
			headers: url_info.headers,
			body: url_info.body,
			responseType: "text",
		});
		
		return wC(response_text)
	}
		
	async listNotebooks(){
		const n = (await this.execute([{ id: "wXbhsf", args: [null, 1] }]))[0].data[0];
		
		return (
		  n.sort((r, o) => r[5][1] - o[5][1]),
		  n.map((r) => ({ id: r[2], title: r[0], emoji: r[3] ,sources: r[1]}))
		);
	}
	async createNotebook(title, emoji){
		return {
			id: (await this.execute([{ id: "CCqFvf", args: [title, emoji] }]))[0].data[2],
		};
	}
	async deleteNotebook(nootbook_id){
		await this.execute([{ id: "WWINqb", args: [[nootbook_id]] }]);
	}
	async addUrlSource(nootbook_id, url){
		const r = url.includes("youtube.com") ? [null, null, null, null, null, null, null, [url]] : [null, null, [url]];
		
		const response = (await this.execute([{ id: "izAoDd", args: [[r], nootbook_id] }]))[0].data[0];
		return {
			id: response[0][0][0],
			source_name: response[0][1]
		};
	}
	async addDocSource(nootbook_id, doc_title, doc_id){
		const r = [[doc_id, "application/vnd.google-apps.document", 1, doc_title]];
		
		const response = (await this.execute([{ id: "izAoDd", args: [[r], nootbook_id] }]))[0].data[0];
		return {
			id: response[0][0][0],
			source_name: response[0][1]
		};
	}
	async addMdSource(nootbook_id, title, md_content){
		return (await this.execute([{ id: "izAoDd", args: [[[null, [title, md_content], null, 3]], nootbook_id] }]))[0].data;
	}
	async deleteSource(source_id){
		await this.execute([{ id: "tGMBJ", args: [[[source_id]]] }]);
	}
	
	async askWithNotebook(source_ids, question){
		let sources = [];
		for (let r = 0; r < source_ids.length; r++) sources.push([[source_ids[r]]]);
		const p = [null,null,null,null,null,null,2,null,null,2];
		
		return (await this.execute([{ id: "yyryJe", args: [sources, p, [question]] }]))[0].data[0] || [];
	}
	async tidyWithNotebook(source_ids, type){
		if (tidy_types.has(type)){
			let sources = [];
			for (let r = 0; r < source_ids.length; r++) sources.push([[source_ids[r]]]);
			const k = [type, [["[CONTEXT]",""]], ""];
		
			return (await this.execute([{ id: "yyryJe", args: [sources, null, null, null, null, k] }]))[0].data[0];
		}
		else{
			return [];
		}
	}

	async addNewNote(nootbook_id, content){
		return (await this.execute([{ id: "CYK0Xb", args: [nootbook_id, content, [2], null, "新記事"] }]))[0].data;
	}
}

export class summaryWithNotebooklm_module{
	constructor(moduleDataRead, moduleDataWrite, notebooklm_setting){
		this.modulename = "NotebooklmSummary";
		
		this.moduleDataRead = moduleDataRead;
		this.moduleDataWrite = moduleDataWrite;
		
		this.authuser = {"account_id": "", "index": -1};
		this.authuser_notebook_sources = {};
		this.authuser_notebook_url_index = {};
		
		this.notebooklm = null;
		this.is_dataloaded = false;
		setTimeout(() => {
			if (!this.is_dataloaded){
				this.loadNotebooklmSummaryData((account_info) => {notebooklm_setting = account_info});
			};
		}, 3000);
		/*
		"[account_id]": {
			"notebook_sources":{
				"[notebook_id]": {
					"main_sources": {"[index]": "[source_id]",...},
					"quote_sources": {"[index]": "[source_id]",...},
					"sources_count": int
				},
				...
			}
			"notebook_url_index":{
				"[url_index]": notebook_id,
				...
			}
		}
		*/
	}
	
	loadNotebooklmSummaryData(callback){
		this.is_dataloaded = true;
		
		let r = this;
		r.moduleDataRead(r.modulename, ['authuser', 'notebooks'], async function (module_data){
			if (module_data.authuser == undefined){
				callback([false, ""]);
				r.saveNotebooklmAuthuserData(() => {});
			}
			else{
				r.authuser = module_data.authuser;
			}
			
			let account_info = (r.authuser.index == -1) ? {"id": "", "email": ""} : ((await r.testAuthUserIndex(r.authuser.index)) || {"id": "", "email": ""});
			
			if (r.authuser.account_id != account_info.id){
				const user_index = await r.getAuthUserIndex(r.authuser.account_id);
				if (user_index >= 0){
					r.authuser = {"account_id": r.authuser.account_id, "index": user_index};
					r.saveNotebooklmAuthuserData();
					
					account_info = await r.testAuthUserIndex(r.authuser.index);
				}
				else{
					r.authuser = {"account_id": "", "index": -1};
				}
			}
			
			if (module_data.notebooks !== undefined){
				const authuser_notebook = module_data.notebooks[r.authuser.account_id];
				if (authuser_notebook !== undefined){
					r.authuser_notebook_sources = authuser_notebook.notebook_sources || {};
					r.authuser_notebook_url_index = authuser_notebook.notebook_url_index  || {};
				}
				else{
					r.authuser_notebook_sources = {};
					r.authuser_notebook_url_index = {};
					
					if (r.authuser.index != -1){
						r.saveNotebooklmSummaryData(() => {});
					}
				}
			}
			else{
				r.saveNotebooklmSummaryData(() => {});
			}
			
			console.log('NotebooklmSummary 設定載入完成');
				
			if (r.authuser.index >= 0){
				r.notebooklm = await notebooklmInteractiveControl.create(r.authuser.index);
				console.log('NotebooklmSummary 已關聯 notebooklm 帳戶');
				callback([true, account_info.email]);
			}
			else{
				r.notebooklm = null;
				console.log('NotebooklmSummary 未連結 notebooklm 帳戶');
				callback([false, ""]);
			}
		});
	}
	
	async listNotebookAuthUsers(){
		let authusers = [];
		const first_authuser = await this.testAuthUserIndex();
		authusers.push(first_authuser.email);
		
		let test_index = 1;
		let test_result = "";
		while((test_result != first_authuser.id) && (test_index <= 10)){
			test_result = await this.testAuthUserIndex(test_index);
			
			if (test_result.id == first_authuser.id){
				break;
			}
			
			authusers.push(test_result.email);
			test_index += 1;
		}
		
		return authusers
	}
	
	setAuthUser(authuser_index = -1, authuser_id = "", callback){
		this.authuser = {
			"account_id": authuser_id,
			"index": authuser_index
		}
		
		this.saveNotebooklmAuthuserData(callback);
	}
	
	saveNotebooklmSummaryData(callback){
		this.moduleDataRead(this.modulename, ['notebooks'], (module_data) => {
			const notebooks = module_data.notebooks || {}
			notebooks[this.authuser.account_id] = {
				"notebook_sources": this.authuser_notebook_sources,
				"notebook_url_index": this.authuser_notebook_url_index
			};
			
			this.moduleDataWrite(this.modulename, 'notebooks', notebooks, (t) => {callback();});
		});
	}
	saveNotebooklmAuthuserData(callback){
		this.moduleDataWrite(this.modulename, 'authuser', this.authuser, (t) => {callback();});
	}
	
	async testAuthUserIndex(index){
		const response_text = await fetchRequest(`https://notebooklm.google.com/?authuser=${index}`, {
			responseType: "text",
			headers: {
				"content-type": "application/x-www-form-urlencoded;charset=utf-8"
		}});
		
		function extractValueByKey(e, t) {
			const r = new RegExp(`"${e}":"([^"]+)"`).exec(t);
			return r == null ? void 0 : r[1];
		}
		
		const email = extractValueByKey("oPEP7c", response_text);
		const id = extractValueByKey("qDCSke", response_text);
		return {id: id, email: email};
	}
	
	async getAuthUserIndex(authuser_id){
		const first_authuser = await this.testAuthUserIndex(0);
		if (first_authuser.id == authuser_id){
			return 0;
		}
		
		let test_index = 1;
		let test_result = null;
		
		while(test_result != first_authuser.id && test_index <= 10){
			test_result = await this.testAuthUserIndex(test_index);
			if (test_result.id == first_authuser.id){
				return -1;
			}
			else if (test_result.id == authuser_id){
				return test_index;
			}
			test_index += 1;
		}
		
		return -1;
	}
	
	async checkNotebooklmSource(current_Host){
		if (!this.notebooklm){
			return {is_done: false, is_remove: false, remove_source_list: []};
		}
		
		if (this.authuser_notebook_url_index[current_Host] == undefined){
			return {is_done: false, is_remove: false, remove_source_list: []};
		}
		
		const target_id = this.authuser_notebook_url_index[current_Host];
		if (this.authuser_notebook_sources[target_id] == undefined){
			return {is_done: false, is_remove: false, remove_source_list: []};
		}
		
		const notebooks = await this.notebooklm.listNotebooks();
		let data_get = null;

		for (let r = 0; r < notebooks.length; r++) if(notebooks[r].id == target_id) data_get = notebooks[r];
		if (data_get == null){
			return {is_done: false, is_remove: false, remove_source_list: []};
		}
		
		const notebooklm_source_ids = data_get.sources.map((k) => (k[0][0]));
		this.authuser_notebook_sources[target_id]["sources_count"] = notebooklm_source_ids.length;
		let remove_list = [];
		
		const main_source_recorded = Object.keys(this.authuser_notebook_sources[target_id]["main_sources"]);
		for (let r = 0; r < main_source_recorded.length; r++){
			if (!notebooklm_source_ids.includes(this.authuser_notebook_sources[target_id]["main_sources"][main_source_recorded[r]])){
				delete this.authuser_notebook_sources[target_id]["main_sources"][main_source_recorded[r]];
				remove_list.push(main_source_recorded[r]);
			}
		}
		
		const quote_source_recorded = Object.keys(this.authuser_notebook_sources[target_id]["quote_sources"]);
		for (let r = 0; r < quote_source_recorded.length; r++){
			if (!notebooklm_source_ids.includes(this.authuser_notebook_sources[target_id]["quote_sources"][quote_source_recorded[r]])){
				delete this.authuser_notebook_sources[target_id]["quote_sources"][quote_source_recorded[r]];
				remove_list.push(quote_source_recorded[r]);
			}
		}
		
		return {is_done: true, is_remove: (remove_list.length != 0), remove_source_list: remove_list};
	}
	
	async createNewNotebook(current_Host){
		const create_response = await this.notebooklm.createNotebook(current_Host, '🔗');
			
		if (create_response.id == undefined){
			return false;
		}
		
		this.authuser_notebook_url_index[current_Host] = create_response.id;
		this.authuser_notebook_sources[create_response.id] = {
			"main_sources": {},
			"quote_sources": {},
			"sources_count": 0
		};
		
		let r = this;
		return new Promise((resolve) => {
			r.saveNotebooklmSummaryData(() => {
				resolve(true);
			});
		});
	}
	
	async tryAllocateSharedNotebook(current_Host){
		let found_notebook = false;
			
		const notebooks = Object.keys(this.authuser_notebook_sources);
		for (let r = 0; r < notebooks.length; r++){
			if (this.authuser_notebook_sources[notebooks[r]]["sources_count"] < 50){
				this.authuser_notebook_url_index[current_Host] = notebooks[r];
				found_notebook = true;
				break;
			}
		}
		
		if (found_notebook){
			let r = this;
			return new Promise((resolve) => {
				r.saveNotebooklmSummaryData(() => {
					resolve(found_notebook);
				});
			});
		}
		else{
			return found_notebook;
		}
	}
	
	async addUrlsToNotebooklm(source_urls, target_id){
		const already_main_source = Object.keys(this.authuser_notebook_sources[target_id]["main_sources"]);
		let add_error = [];
		let add_done = false;
		
		for (let r = 0; r < source_urls.length; r++){
			if (already_main_source.includes(source_urls[r])){
				continue;
			}
			
			const add_response = await this.notebooklm.addUrlSource(target_id, source_urls[r]);
			
			if (add_response.id == undefined){
				add_error.push(source_urls[r]);
				continue;
			}
			
			this.authuser_notebook_sources[target_id]["main_sources"][source_urls[r]] = add_response.id;
			this.authuser_notebook_sources[target_id]["sources_count"] += 1;
			add_done = true;
		}
		
		if (add_done){
			let r = this;
			return new Promise((resolve) => {
				r.saveNotebooklmSummaryData(() => {
					resolve({is_done: add_done, is_error: (add_error.length != 0), error_source_list: add_error});
				});
			});
		}
		else{
			return {is_done: add_done, is_error: (add_error.length != 0), error_source_list: add_error};
		}
	}
	
	async summaryUrl(current_Url, current_Host){
		if (!this.notebooklm){
			return {is_done: false, tidy_response: null};
		}
		
		let has_notebook = true;
		if (this.authuser_notebook_url_index[current_Host] == undefined){
			has_notebook = await this.tryAllocateSharedNotebook(current_Host);
		}
		if (!has_notebook){
			const create_response = await this.createNewNotebook(current_Host);
			
			if (!create_response){
				return {is_done: false, tidy_response: null};
			}
		}
		
		const target_id = this.authuser_notebook_url_index[current_Host];
		if (Object.keys(this.authuser_notebook_sources[target_id]["main_sources"]).length == 0){
			const add_response = await this.addUrlsToNotebooklm([current_Url], target_id);
			
			if (add_response.error_source_list.includes(current_Url)){
				return {is_done: false, tidy_response: null};
			}
		}
			
		const tidy_response = await this.notebooklm.tidyWithNotebook([this.authuser_notebook_sources[target_id]["main_sources"][current_Url]], 'briefing_doc')
		return {is_done: (tidy_response != []), tidy_response: tidy_response};		
	}
}