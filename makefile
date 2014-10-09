start:
	@supervisor app.js &
test:
	@jasmine-node test
.PHONY:start test