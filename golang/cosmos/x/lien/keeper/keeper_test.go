package keeper

import (
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/store"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	"github.com/tendermint/tendermint/crypto/secp256k1"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
	dbm "github.com/tendermint/tm-db"
)

var (
	lienStoreKey    = storetypes.NewKVStoreKey(types.StoreKey)
	authStoreKey    = storetypes.NewKVStoreKey(authtypes.StoreKey)
	bankStoreKey    = storetypes.NewKVStoreKey(banktypes.StoreKey)
	paramsStoreKey  = storetypes.NewKVStoreKey(paramstypes.StoreKey)
	paramsTKey      = storetypes.NewTransientStoreKey(paramstypes.TStoreKey)
	stakingStoreKey = storetypes.NewKVStoreKey(stakingtypes.StoreKey)
)

var (
	priv1 = secp256k1.GenPrivKey()
	priv2 = secp256k1.GenPrivKey()
	priv3 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address())
	addr2 = sdk.AccAddress(priv2.PubKey().Address())
	addr3 = sdk.AccAddress(priv3.PubKey().Address())
)

var (
	minterAcc = authtypes.NewEmptyModuleAccount(authtypes.Minter, authtypes.Minter)
)

/*
type mockBank struct {
	balances map[string]sdk.Coins
}

var _ types.BankKeeper = (*mockBank)(nil)

func (b *mockBank) GetAllBalances(_ sdk.Context, addr sdk.AccAddress) sdk.Coins {
	return b.balances[addr.String()]
}

type mockStake struct {
	bonded map[string]sdk.Coins
	unbonding map[string]sdk.Coins
}

var _ types.StakingKeeper = (*mockStake)(nil)

func (s *mockStake) GetDelegatorDelegations(_ sdk.Context, del sdk.AccAddress, _ uint16) []stakingTypes.Delegation {
	return []stakingTypes.Delegation{} // XXX
}

func (s *mockStake) GetUnbondingDelegations(_ sdk.Context, delegator sdk.AccAddress, _ uint16) []stakingTypes.UnbondingDelegation {
	return []stakingTypes.UnbondingDelegation{}
}

func (s *mockStake) GetValidator(ctx sdk.Context, addr sdk.ValAddress) (stakingTypes.Validator, bool)
*/

func makeTestKit() (sdk.Context, bankkeeper.Keeper, stakingkeeper.Keeper, Keeper) {
	encodingConfig := params.MakeEncodingConfig()
	authtypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	cdc := encodingConfig.Marshaller

	// params keeper
	pk := paramskeeper.NewKeeper(cdc, encodingConfig.Amino, paramsStoreKey, paramsTKey)
	authSpace := pk.Subspace(authtypes.ModuleName)
	bankSpace := pk.Subspace(banktypes.ModuleName)
	stakingSpace := pk.Subspace(stakingtypes.ModuleName)

	// auth keeper
	maccPerms := map[string][]string{
		stakingtypes.BondedPoolName:    {authtypes.Burner, authtypes.Staking},
		stakingtypes.NotBondedPoolName: {authtypes.Burner, authtypes.Staking},
		authtypes.Minter:               {authtypes.Minter},
	}
	innerAk := authkeeper.NewAccountKeeper(cdc, authStoreKey, authSpace, authtypes.ProtoBaseAccount, maccPerms)
	wak := types.NewWrappedAccountKeeper(innerAk)

	// bank keeper
	blockedAddrs := make(map[string]bool)
	blockedAddrs[authtypes.NewModuleAddress(stakingtypes.BondedPoolName).String()] = true
	blockedAddrs[authtypes.NewModuleAddress(stakingtypes.NotBondedPoolName).String()] = true
	bk := bankkeeper.NewBaseKeeper(cdc, bankStoreKey, wak, bankSpace, blockedAddrs)

	// staking keeper
	sk := stakingkeeper.NewKeeper(cdc, stakingStoreKey, wak, bk, stakingSpace)

	// lien keeper
	callToController := func(sdk.Context, string) (string, error) {
		return "", nil
	}
	keeper := NewKeeper(lienStoreKey, cdc, wak, bk, sk, callToController)
	wak.SetWrapper(keeper.GetAccountWrapper())

	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(paramsTKey, sdk.StoreTypeTransient, nil)
	ms.MountStoreWithDB(paramsStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(authStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(bankStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(stakingStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(lienStoreKey, sdk.StoreTypeIAVL, db)
	ms.LoadLatestVersion()
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	wak.SetParams(ctx, authtypes.DefaultParams())
	bk.SetParams(ctx, banktypes.DefaultParams())
	wak.SetModuleAccount(ctx, minterAcc)

	return ctx, bk, sk, keeper
}

func TestGetSetLien(t *testing.T) {
	ctx, _, _, keeper := makeTestKit()

	// Empty
	l1 := keeper.GetLien(ctx, addr1)
	if !l1.GetCoins().IsZero() {
		t.Errorf("empty lien has %v, want empty", l1)
	}

	// Initialize
	amt := sdk.NewCoins(sdk.NewInt64Coin("ubld", 123))
	lien := types.Lien{Coins: amt}
	keeper.SetLien(ctx, addr1, lien)
	l2 := keeper.GetLien(ctx, addr1)
	if !l2.Coins.IsEqual(amt) {
		t.Errorf("initial lien has %v, want %s", l2, amt)
	}

	// Delete
	keeper.SetLien(ctx, addr1, types.Lien{})
	l3 := keeper.GetLien(ctx, addr1)
	if !l3.Coins.IsZero() {
		t.Errorf("zeroed lien has %v, want empty", l3)
	}
}

func TestIterateLiens(t *testing.T) {
	ctx, _, _, keeper := makeTestKit()

	var liens map[string]types.Lien
	cb := func(a sdk.AccAddress, l types.Lien) bool {
		liens[a.String()] = l
		return false
	}
	reset := func() {
		liens = make(map[string]types.Lien)
	}

	// Empty
	reset()
	keeper.IterateLiens(ctx, cb)
	if len(liens) > 0 {
		t.Errorf("empty lien store has %v", liens)
	}

	// One
	reset()
	amt1 := sdk.NewCoins(sdk.NewInt64Coin("ubld", 123))
	keeper.SetLien(ctx, addr1, types.Lien{Coins: amt1})
	keeper.IterateLiens(ctx, cb)
	wantLiens := map[string]types.Lien{
		addr1.String(): {Coins: amt1},
	}
	if !reflect.DeepEqual(liens, wantLiens) {
		t.Errorf("singleton lien store has liens %v, want %v", liens, wantLiens)
	}

	// Several (including zero)
	reset()
	amt2 := sdk.NewCoins(sdk.NewInt64Coin("ubld", 456))
	keeper.SetLien(ctx, addr2, types.Lien{Coins: amt2})
	keeper.SetLien(ctx, addr3, types.Lien{})
	keeper.IterateLiens(ctx, cb)
	wantLiens[addr2.String()] = types.Lien{Coins: amt2}
	if !reflect.DeepEqual(liens, wantLiens) {
		t.Errorf("multiple lien store has liens %v, want %v", liens, wantLiens)
	}
}

func TestAccountState(t *testing.T) {
	ctx, bk, _, keeper := makeTestKit()

	state := keeper.GetAccountState(ctx, addr1)
	wantState := AccountState{}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() of empty got %v, want %v", state, wantState)
	}

	amt1 := sdk.NewCoins(sdk.NewInt64Coin("ubld", 123))
	keeper.SetLien(ctx, addr1, types.Lien{Coins: amt1})
	state = keeper.GetAccountState(ctx, addr1)
	wantState = AccountState{Liened: amt1}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() of lein only got %v, want %v", state, wantState)
	}

	amt2 := sdk.NewCoins(sdk.NewInt64Coin("urun", 5000), sdk.NewInt64Coin("moola", 22))
	bk.MintCoins(ctx, authtypes.Minter, amt2)
	bk.SendCoinsFromModuleToAccount(ctx, authtypes.Minter, addr1, amt2)
	state = keeper.GetAccountState(ctx, addr1)
	wantState = AccountState{
		Total:  amt2,
		Liened: amt1,
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() ver 3 got %v, want %v", state, wantState)
	}
}
