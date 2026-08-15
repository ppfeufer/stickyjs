.PHONY: build
build:
	@echo "Building JavaScript files …"
	@npm run build

.PHONY: lint
lint:
	@echo "Linting JavaScript files …"
	@npm run lint

.PHONY: minify
minify:
	@echo "Minifying JavaScript files …"
	@npm run minify

help::
	@echo "  $(TEXT_UNDERLINE)Development:$(TEXT_UNDERLINE_END)"
	@echo "    build                     Build JavaScript distribution files"
	@echo "    lint                      Lint JavaScript files"
	@echo "    minify                    Minify JavaScript files"
	@echo ""
