LESSC = ./node_modules/.bin/lessc
JADE = ./node_modules/.bin/jade

prepare: compile-assets

install:
	npm install

compile-assets: install
	echo "/* Generated with LESS - Do not modify */" > src/master.css
	echo "/* Generated with LESS - Do not modify */" > src/resume.css
	echo "<!-- Generated with Jade - Do not modify -->" > src/index.html
	echo "<!-- Generated with Jade - Do not modify -->" > src/resume.html
	${LESSC} -O3 --yui-compress assets/css/master.less >> src/master.css
	${LESSC} -O3 --yui-compress assets/css/resume.less >> src/resume.css
	${JADE} -p views/layout.jade < views/index.jade >> src/index.html
	${JADE} < views/resume.jade >> src/resume.html

dev:
	supervisor -n exit -e 'less,jade' -x make compile-assets
