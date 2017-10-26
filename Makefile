default: install

install:
	yarn install
	go generate ./...
	go install .
