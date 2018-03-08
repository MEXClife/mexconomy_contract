
compile:
	truffle compile

clean:
	truffle networks --clean
	rm -rf ./build

reset: clean
	truffle migrate --reset

migrate:
	truffle migrate --network development

test: compile
	truffle test --network development

rpc:
	ganache-cli -u 0 -p 7545
	
