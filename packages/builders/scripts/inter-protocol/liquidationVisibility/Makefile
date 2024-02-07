SDK_ROOT = $(shell cd ../../../../../ >/dev/null && pwd)
AGORIC = $(SDK_ROOT)/packages/agoric-cli/bin/agoric
AGD = $(SDK_ROOT)/bin/agd
LOCAL_CHAIN_ID = agoriclocal

DEV_CHAIN_ID = agoricdev-23
DEV_RPC = https://devnet.rpc.agoric.net:443
DEV_WALLET = gov

GAS = 120000000
GAS_ADJUSTMENT = 1.2
VOTE_PROPOSAL = 1
VOTE_OPTION = yes

PROPOSAL_BUILDER = ${shell pwd}/proposal-builder.js
HOME = $(SDK_ROOT)/packages/cosmic-swingset/t1/bootstrap
LOCAL_WALLET = bootstrap

VAULT_BUNDLE_ID = @cache/$(call GetFromPlan, bundles[0].bundleID).json
MANIFEST_BUNDLE_ID = @cache/$(call GetFromPlan, bundles[1].bundleID).json

define GetFromPlan
$(shell node -p "require('./vaultFactory-plan.json').$(1)")
endef


# ====================================================     Build Proposal   =================================================

agoric-run:
	rm -rf ${shell pwd}/cache/*
	${AGORIC} run ${PROPOSAL_BUILDER}

# ====================================================     Install Bundles    =================================================

install-vault-bundle:
	${AGD} tx swingset install-bundle ${VAULT_BUNDLE_ID} \
		--from=${LOCAL_WALLET} --home=${HOME}  --chain-id=${LOCAL_CHAIN_ID} --keyring-backend=test --gas=$(GAS) --yes -b block

install-manifest-bundle:
	${AGD} tx swingset install-bundle ${MANIFEST_BUNDLE_ID} \
		--from=${LOCAL_WALLET} --home=${HOME}  --chain-id=${LOCAL_CHAIN_ID} --keyring-backend=test --gas=$(GAS) --yes -b block

install-bundles: install-vault-bundle install-manifest-bundle

# ====================================================     Submit proposal   =================================================

submit-proposal:
	${AGD} tx gov submit-proposal swingset-core-eval vaultFactory-permit.json vaultFactory.js \
		--title="Enable vaultFactory update" --description="Update vaultFactory to extend liquidation visibility" --deposit=1000000ubld \
		--gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
		--from=${LOCAL_WALLET} --home=${HOME}  --chain-id=${LOCAL_CHAIN_ID} --keyring-backend=test --yes -b block

# ====================================================     Vote proposal   =================================================

vote:
	$(AGD) tx gov vote $(VOTE_PROPOSAL) $(VOTE_OPTION) \
		--gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
		--from=${LOCAL_WALLET} --home=${HOME}  --chain-id=${LOCAL_CHAIN_ID} --keyring-backend=test --yes -b block

# ====================================================     Devnet   =================================================

install-contract-bundle-dev:
	${AGD} tx swingset install-bundle ${VAULT_BUNDLE_ID} \
		--from=${DEV_WALLET} --node=$(DEV_RPC)  --chain-id=${DEV_CHAIN_ID} --gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) --yes -b block

install-manifest-bundle-dev:
	${AGD} tx swingset install-bundle ${MANIFEST_BUNDLE_ID} \
		--from=${DEV_WALLET} --node=$(DEV_RPC)  --chain-id=${DEV_CHAIN_ID} --gas=auto --yes -b block

install-bundles-dev: install-contract-bundle-dev install-manifest-bundle-dev

submit-proposal-dev:
	${AGD} tx gov submit-proposal swingset-core-eval startSimpleExchange-permit.json startSimpleExchange.js \
		--title="Enable simpleExchange" --description="Evaluate startSimpleExchange.js" --deposit=1000000ubld \
		--gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
		--from=${DEV_WALLET} --node=$(DEV_RPC)  --chain-id=${DEV_CHAIN_ID} --yes -b block

vote-dev:
	$(AGD) tx gov vote $(VOTE_PROPOSAL) $(VOTE_OPTION) \
		--gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
		--from=${DEV_WALLET} --node=$(DEV_RPC)  --chain-id=${DEV_CHAIN_ID} --yes -b block


# ====================================================     Deployment    =================================================		

local-proposal: agoric-run install-bundles submit-proposal vote

dev-proposal: agoric-run install-bundles-dev submit-proposal-dev vote-dev