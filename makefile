.PHONY: help build-chrome copyfiles

help:
	cat makefile

build-chrome: copyfiles
	rm -rf $(CURDIR)/save-gptchat-as-pdf-chrome.zip
	cd /tmp/save-chatgpt-to-pdf/ && zip -r $(CURDIR)/save-gptchat-as-pdf-chrome.zip .

copyfiles:
	rm -rf /tmp/save-chatgpt-to-pdf/
	mkdir /tmp/save-chatgpt-to-pdf/
	rsync -q -av --exclude-from=exclude.txt . /tmp/save-chatgpt-to-pdf/
