start:
	@supervisor app.js &
test:
	@jasmine-node test
commit:
	@git add .
	@git commit -am"${message} : `date`" | :
push: commit
	@git push origin
.PHONY:start test