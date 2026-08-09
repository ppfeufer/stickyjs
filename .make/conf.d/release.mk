# Prepare a new release
# Update the graph of the models, translation files and the version in the package
.PHONY: prepare-release
prepare-release: pot
	@echo "Preparing a release…"
	@read -p "New Version Number: " new_version; \
	if ! grep -qE "^## \[$$new_version\]" CHANGELOG.md; then \
		previous_version=$$(grep -m 1 -E '^## \[[0-9]+(\.[0-9]+){0,3}\] - ' CHANGELOG.md | sed -E 's/^## \[([0-9]+(\.[0-9]+){0,3})\].*$$/\1/');  \
		echo "Previous release version detected: $$previous_version"; \
		echo "$(TEXT_COLOR_RED)$(TEXT_BOLD)Version $$new_version not found in CHANGELOG.md!$(TEXT_RESET)"; \
		echo "Adding a new section for version $$new_version."; \
		echo "Please check and update the $(TEXT_BOLD)CHANGELOG.md$(TEXT_RESET) file accordingly."; \
		sed -i "/<!-- Your changes go here -->/a\\\n## [$$new_version] - $$(date '+%Y-%m-%d')" CHANGELOG.md; \
		echo "[$$new_version]: $(GIT__GIT_REPOSITORY)/compare/v$$previous_version...v$$new_version \"v$$new_version\"" >> CHANGELOG.md; \
	fi; \
	# Update the version in package.json and rebuild node modules \
	sed -i -E "\|\"version\"\: |s|\"\: .*|\"\: \"$$new_version\",|g" package.json; \
	rm -rf node_modules; \
	rm package-lock.json; \
	npm install; \
	# Update the version in the main JS file and minify it \
	sed -i -E "\|\* @version |s|@version .*|@version $$new_version|g" dist/stickyjs.js; \
	make minify-js; \
	if [[ $$new_version =~ (alpha|beta) ]]; then \
		echo "$(TEXT_COLOR_RED)$(TEXT_BOLD)Pre-release$(TEXT_RESET) version detected!"; \
		git restore $(TRANSLATION__TEMPLATE); \
	elif [[ $$new_version =~ rc ]]; then \
		echo "$(TEXT_COLOR_YELLOW)$(TEXT_BOLD)Release Candidate$(TEXT_RESET) version detected!"; \
	else \
		echo "$(TEXT_BOLD)Release$(TEXT_BOLD_END) version detected."; \
		sed -i -E "\|\[in development\]\: |s|\]\: .*|\]\: $(GIT__GIT_REPOSITORY)/compare/v$$new_version...HEAD \"In Development\"|g" CHANGELOG.md; \
	fi;

# Create a new release archive
.PHONY: release-archive
release-archive:
	@echo "Creating a new release archive …"
	@rm -f $(GENERAL__APPNAME).zip
	@rm -rf $(GENERAL__APPNAME)/
	@rsync \
		-ax \
		--exclude-from=.make/rsync-exclude.lst \
		. \
		$(GENERAL__APPNAME)/
	@zip \
		-r \
		$(GENERAL__APPNAME).zip \
		$(GENERAL__APPNAME)/
	@rm -rf $(GENERAL__APPNAME)/

# Help message for the Release commands
.PHONY: help
help::
	@echo "  $(TEXT_UNDERLINE)Release:$(TEXT_UNDERLINE_END)"
	@echo "    prepare-release           Prepare a new release."
	@echo "    release-archive           Create a release archive."
	@echo "                              The release archive ($(GENERAL__APPNAME).zip) will be created in the root"
	@echo "                              directory of the theme."
	@echo ""
