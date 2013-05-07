LESSC = ./node_modules/less/bin/lessc

prepare: compile-assets
	npm install

compile-assets:
	${LESSC} -O3 --yui-compress assets/css/master.less > public/master.css
	${LESSC} -O3 --yui-compress assets/css/resume.less > public/resume.css

dev:
	supervisor -n exit -e 'less' -x make compile-assets &
	supervisor -n error -i 'public' jacobwirth.js
