//---- background ----
export const initSubPageIndexs = ['www.google.com', 'www.bing.com', 'www.youtube.com', 'www.twitch.tv', 'forum.gamer.com.tw', 'home.gamer.com.tw'];

export function isSubPageIndex(host){
	return initSubPageIndexs.includes(host);
	
	/*
	if (initSubPageIndexs.includes(host)){
		return true;
	}
	else{
		
	}
	*/
}

export function responseSidepanelSubPageIndexUrlNoteData(title, host, url, responseUrlNoteData, getNotePriority, responseSidepanelUrlNoteData, callback){
	let is_match = false;
	switch(host){
		case 'www.google.com':
			const google_url = new URL(url);

			if (google_url.searchParams.has('q')){
				is_match = true;
				const google_key_index = host + ':' + google_url.searchParams.get('q');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="-2 -2 24 24" style="position: relative;top: calc(50% - 0.5em);">
									  	<g fill="currentColor">
									  		<path d="M7.188 9.034a2.972 2.972 0 0 0 .028 2.01a2.973 2.973 0 0 0 4.285 1.522a2.98 2.98 0 0 0 1.283-1.522H10.11V9.066h4.803a5.005 5.005 0 0 1-1.783 4.833A5 5 0 1 1 10 5a4.982 4.982 0 0 1 3.191 1.152l-1.62 1.326a2.974 2.974 0 0 0-4.384 1.557z" />
									  		<path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0-2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4" />
									  	</g>
									  </svg>
									  ${title.slice(0, title.indexOf(' - '))}`;
				
				responseUrlNoteData(google_key_index, (google_notedata) => {
					if (google_notedata == null){
						callback(output_title, google_key_index, null, null);
					}
					else{
						getNotePriority(host, (google_priority) => {
							if (google_priority == -1){
								callback(output_title, google_key_index, google_notedata, []);
							}
							else{
								callback(output_title, google_key_index, google_notedata, google_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.bing.com':
			const bing_url = new URL(url);
			let bing_pathnames = bing_url.pathname;
			bing_pathnames = bing_pathnames.slice(1).split('/')
			
			if ((bing_pathnames[0] == 'search') && bing_url.searchParams.has('q')){
				is_match = true;
				const bing_key_index = host + ':' + bing_url.searchParams.get('q');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="m10.129 8.596l1.735 4.328l2.77 1.29L19 16.247V11.7z" opacity="0.7" />
										<path fill="currentColor" d="M14.634 14.214L9 17.457V3.4L5 2v17.76L9 22l10-5.753V11.7z" />
									  </svg>
									  ${title.slice(0, title.indexOf(' - '))}`;
				
				responseUrlNoteData(bing_key_index, (bing_notedata) => {
					if (bing_notedata == null){
						callback(output_title, bing_key_index, null, null);
					}
					else{
						getNotePriority(host, (bing_priority) => {
							if (bing_priority == -1){
								callback(output_title, bing_key_index, bing_notedata, []);
							}
							else{
								callback(output_title, bing_key_index, bing_notedata, bing_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.youtube.com':
			const youtube_url = new URL(url);

			if (youtube_url.searchParams.has('v')){
				is_match = true;
				const youtube_key_index = host + ':' + youtube_url.searchParams.get('v');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="m10 15l5.19-3L10 9zm11.56-7.83c.13.47.22 1.1.28 1.9c.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83c-.25.9-.83 1.48-1.73 1.73c-.47.13-1.33.22-2.65.28c-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44c-.9-.25-1.48-.83-1.73-1.73c-.13-.47-.22-1.1-.28-1.9c-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83c.25-.9.83-1.48 1.73-1.73c.47-.13 1.33-.22 2.65-.28c1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44c.9.25 1.48.83 1.73 1.73"></path>
									  </svg>
									  ${title.replace(/\(\d+\) /, '').slice(0, -10)}`;
				
				responseUrlNoteData(youtube_key_index, (youtube_notedata) => {
					if (youtube_notedata == null){
						callback(output_title, youtube_key_index, null, null);
					}
					else{
						getNotePriority(host, (youtube_priority) => {
							if (youtube_priority == -1){
								callback(output_title, youtube_key_index, youtube_notedata, []);
							}
							else{
								callback(output_title, youtube_key_index, youtube_notedata, youtube_priority);
							}
						});
					}
				});
			}
			break;
		case 'www.twitch.tv':
			const twitch_url = new URL(url);
			let twitch_pathnames = twitch_url.pathname;
			twitch_pathnames = twitch_pathnames.slice(1).split('/')
			
			if (twitch_pathnames.length == 1 && Boolean(twitch_pathnames[0])){
				is_match = true;
				const twitch_key_index = host + ':' + twitch_pathnames[0];
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style="position: relative;top: calc(50% - 0.5em);">
										<path fill="currentColor" d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z" />
									  </svg>
									  ${title.slice(0, -9)}`;
									  
				if (title == 'Twitch'){
					break;
				}
				
				responseUrlNoteData(twitch_key_index, (twitch_notedata) => {
					if (twitch_notedata == null){
						callback(output_title, twitch_key_index, null, null);
					}
					else{
						getNotePriority(host, (twitch_priority) => {
							if (twitch_priority == -1){
								callback(output_title, twitch_key_index, twitch_notedata, []);
							}
							else{
								callback(output_title, twitch_key_index, twitch_notedata, twitch_priority);
							}
						});
					}
				});
			}
			break;
		case 'forum.gamer.com.tw':
			const forumgamer_url = new URL(url);
			
			if (forumgamer_url.searchParams.has('bsn')){
				is_match = true;
				const forumgamer_key_index = host + ':' + forumgamer_url.searchParams.get('bsn');
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 40 40" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M 35 4 l 1 1 l 0 1 l -1 -1 l -2 5 q -0.3 1 0.5 2 l 3 -2.6 l -2 -0.2 q 1 0 2.5 -0.5 q 0 -0.4 -2 -0.4 l 3.018 -0.2 l 1 0.6 l 0.6 0 l 0.5 1 l -1 1 l -1 -1 l -1 1 q 0.2 1 0 2 l 2 -0.3 l 0.6 1 l -1 1 l -0.5 -1 l -2 1 l -1 -0.2 l -2 1 q 0.2 4 -3 3 l -0.921 1.4 q 6 -0.4 8 4 a 1 1 0 0 0 -11 7 q 3 5 10 2.5 a 1 1 0 0 1 -11 -11 q 1 -1 2.5 -2 q 0 -2 0.6 -2 q 0.8 1 2 -2 c -11 6 -10 -0.726 -20 1 c 13 -2 11 4 20 -4 q -3 -1 -8 3 q 4 -8 -8 -2 q 10 -8 -13 -9 l 12 -2 l -12 -2 q 23 -3 33 3 z" />
									  </svg>
									  ${title.slice(title.indexOf('@') + 1, title.indexOf(' - ')) }`;
				
				responseUrlNoteData(forumgamer_key_index, (forumgamer_notedata) => {
					if (forumgamer_notedata == null){
						callback(output_title, forumgamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (forumgamer_priority) => {
							if (forumgamer_priority == -1){
								callback(output_title, forumgamer_key_index, forumgamer_notedata, []);
							}
							else{
								callback(output_title, forumgamer_key_index, forumgamer_notedata, forumgamer_priority);
							}
						});
					}
				});
			}
			break;
		case 'home.gamer.com.tw':
			const homegamer_url = new URL(url);
			let homegamer_pathnames = homegamer_url.pathname;
			homegamer_pathnames = homegamer_pathnames.slice(1).split('/')
			
			if (['artwork.php', 'creationDetail.php'].includes(homegamer_pathnames[0])){
				is_match = true;
				const homegamer_key_index = host + ':' + title.slice(title.indexOf(' - ') + 3, title.indexOf('的創作'));
				
				if (homegamer_key_index == (host + ':')){
					break;
				}
				
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M20.917 6.883l.7 0 .8-.3q.85 2 1.4 2.15-.1 1 .1 2.27-1.5-3.2-2.25-2.5l-1 2.2q0 1 .7 2.2-.6-.5-1-1.5l-3.3 7.4q.04 1.4 1.18 2.6l1.45-.3-.85-.35 2.05-.4q-.3.15-.8-.6l2-.7-1.3.1 2.5-1.4 1.35-1.2q-2.7.4-5 0l5.5-1q-1-.7-4.5-.6 1-.6 6.8-.5l2.6 1.1q.6-.5 1.1 1.2l-.2.25q-.154-.433-.4-.5l-.1.3-.4-.4-1.2 0-.7.7q.5 1 1 1l.19-.1.02.1.8 0-1 .7q-.2-.5-2-.6l-1.5 2-.1 2-.5 1 3.6-.4 2 1.3-.7 1.7-.117-.441-1 1-.1-1-1.2.8.3-1.4-4 1.5-3 0-1 1q-5 1.8-10-1l2-.2 1.4-1.5q-3-2-10 1l2.4-2.4q-8-13 8-20zm7.4 8.7-2-.3 1 .7z" />
									  </svg>
									  ${title.slice(title.lastIndexOf(' - ', title.indexOf('的創作')) + 3, title.indexOf('的創作'))}`;
				
				responseUrlNoteData(homegamer_key_index, (homegamer_notedata) => {
					if (homegamer_notedata == null){
						callback(output_title, homegamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (homegamer_priority) => {
							if (homegamer_priority == -1){
								callback(output_title, homegamer_key_index, homegamer_notedata, []);
							}
							else{
								callback(output_title, homegamer_key_index, homegamer_notedata, homegamer_priority);
							}
						});
					}
				});
			}
			else if (homegamer_url.searchParams.has('owner')){
				is_match = true;
				const homegamer_key_index = host + ':' + homegamer_url.searchParams.get('owner');
				
				if (homegamer_key_index == (host + ':')){
					break;
				}
				
				const output_title = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" style="position: relative;top: calc(50% - 0.5em);">
											<path fill="currentColor" d="M20.917 6.883l.7 0 .8-.3q.85 2 1.4 2.15-.1 1 .1 2.27-1.5-3.2-2.25-2.5l-1 2.2q0 1 .7 2.2-.6-.5-1-1.5l-3.3 7.4q.04 1.4 1.18 2.6l1.45-.3-.85-.35 2.05-.4q-.3.15-.8-.6l2-.7-1.3.1 2.5-1.4 1.35-1.2q-2.7.4-5 0l5.5-1q-1-.7-4.5-.6 1-.6 6.8-.5l2.6 1.1q.6-.5 1.1 1.2l-.2.25q-.154-.433-.4-.5l-.1.3-.4-.4-1.2 0-.7.7q.5 1 1 1l.19-.1.02.1.8 0-1 .7q-.2-.5-2-.6l-1.5 2-.1 2-.5 1 3.6-.4 2 1.3-.7 1.7-.117-.441-1 1-.1-1-1.2.8.3-1.4-4 1.5-3 0-1 1q-5 1.8-10-1l2-.2 1.4-1.5q-3-2-10 1l2.4-2.4q-8-13 8-20zm7.4 8.7-2-.3 1 .7z" />
									  </svg>
									  ${homegamer_url.searchParams.get('owner')}`;
				
				responseUrlNoteData(homegamer_key_index, (homegamer_notedata) => {
					if (homegamer_notedata == null){
						callback(output_title, homegamer_key_index, null, null);
					}
					else{
						getNotePriority(host, (homegamer_priority) => {
							if (keywords_priority == -1){
								callback(output_title, homegamer_key_index, homegamer_notedata, []);
							}
							else{
								callback(output_title, homegamer_key_index, homegamer_notedata, homegamer_priority);
							}
						});
					}
				});
			}
			break;
	}
	
	if (!is_match){
		responseSidepanelUrlNoteData(host, (host_notedata, keywords_priority) => {
			const response_host_notedata = {
				event_name: 'response-url-notedata',
				host: host,
				host_notedata: host_notedata,
				keywords_priority: keywords_priority
			};
			chrome.runtime.sendMessage(response_host_notedata, (t) => {});
		});
	}
}

