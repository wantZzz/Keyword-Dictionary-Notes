var self_PageInfo = {
	initSettingPageFun: {
		display_tab: runInitialDisplayTab,
		support_tab: null
	}
};
var display_Setting = {
	settings: {
		isDarkMode: null,
		isSwitchWithTab: null
	}
};

// ====== 資料處理 ====== 
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function triggerAlertWindow(message, type){
	const notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

// ====== 元素事件 ====== 
function switchCenterPage(event){
	const center_area = document.getElementById('center_area');
	const TargetPageId = event.target.closest('button').getAttribute('open_page');
	const CenterPages = center_area.querySelectorAll(':scope > div');
	let is_found = false;
	
	CenterPages.forEach(function (center_page){
		if (center_page.id == TargetPageId){
			center_page.style.display = "block";
			is_found = true;
			
			if (self_PageInfo.initSettingPageFun[TargetPageId] != null){
				self_PageInfo.initSettingPageFun[TargetPageId]();
				self_PageInfo.initSettingPageFun[TargetPageId] == null;
			}
		}
		else{
			center_page.style.display = "none";
		}
	});
}

function displaySwitchOnClick(event){
	const switch_content = event.target.closest('li.switch_content');
	const SettingValue = switch_content.classList.contains('on');
	const SettingName = switch_content.getAttribute('setting_name');
	
	if (display_Setting.settings[SettingName] !== undefined){
		if (display_Setting.settings[SettingName] == SettingValue){
			const QuestData = {
				event_name: 'update-setting-change',
				settingName: SettingName,
				value: !SettingValue,
				moduleName: null
			};
				
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					if (returnData.afterValue){
						switch_content.classList.add('on');
					}
					else{
						switch_content.classList.remove('on');
					}
					
					display_Setting.settings[SettingName] = returnData.afterValue;
				}
			});
		}
	}
	else{
		triggerAlertWindow(chrome.i18n.getMessage('unregister_setting'), 'error');
	}
}

// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
	switch (request.event_name) {
		
	}
});

// ====== 初始化 ======
function runInitial(){
	const sidebar_area = document.getElementById('sidebar_area');
	const TitleButtons = sidebar_area.querySelectorAll('button.title_botton');
	TitleButtons.forEach(function (titleButton){
		titleButton.addEventListener('click', switchCenterPage);
	});
}

async function runInitialDisplayTab(){
	const settingNames = Object.keys(display_Setting.settings);
	
	const QuestData = {
		event_name: 'quest-setting-data',
		settingNames: settingNames,
		moduleName: null
	};
	
	await chrome.runtime.sendMessage(QuestData, function (returnData){
		if (returnData.isFinish){
			const display_tab = document.getElementById('display_tab');
			const SettingSwitchs = display_tab.querySelectorAll('li.switch_content');
			
			SettingSwitchs.forEach((SettingSwitch) => {
				const SettingName = SettingSwitch.getAttribute('setting_name');
				const SwitchToggle = SettingSwitch.querySelector('.switch_toggle');
				
				if (returnData.settings[SettingName] !== undefined){
					if (returnData.settings[SettingName]){
						SettingSwitch.classList.add('on');
					}
					else{
						SettingSwitch.classList.remove('on');
					}
					
					SwitchToggle.addEventListener('click', displaySwitchOnClick);
				}
				else{
					SwitchToggle.remove();
				}
			});
			
			display_Setting.settings = returnData.settings;
		}
	});
}

runInitial();
