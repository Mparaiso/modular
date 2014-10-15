test:
	@npm test
start:
	@supervisor app.js &
commit:
	@git add .
	@git commit -am"${message} : `date`" | :
push: commit
	@git push origin
.PHONY:start test