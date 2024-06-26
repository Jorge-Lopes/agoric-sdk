// Code generated by protoc-gen-gogo. DO NOT EDIT.
// source: agoric/vbank/vbank.proto

package types

import (
	fmt "fmt"
	github_com_cosmos_cosmos_sdk_types "github.com/cosmos/cosmos-sdk/types"
	types "github.com/cosmos/cosmos-sdk/types"
	_ "github.com/gogo/protobuf/gogoproto"
	proto "github.com/gogo/protobuf/proto"
	io "io"
	math "math"
	math_bits "math/bits"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.GoGoProtoPackageIsVersion3 // please upgrade the proto package

// The module governance/configuration parameters.
type Params struct {
	// reward_epoch_duration_blocks is the length of a reward epoch, in blocks.
	// A value of zero has the same meaning as a value of one:
	// the full reward buffer should be distributed immediately.
	RewardEpochDurationBlocks int64 `protobuf:"varint,1,opt,name=reward_epoch_duration_blocks,json=rewardEpochDurationBlocks,proto3" json:"reward_epoch_duration_blocks,omitempty" yaml:"reward_epoch_duration_blocks"`
	// per_epoch_reward_fraction is a fraction of the reward pool to distrubute
	// once every reward epoch.  If less than zero, use approximately continuous
	// per-block distribution.
	PerEpochRewardFraction github_com_cosmos_cosmos_sdk_types.Dec `protobuf:"bytes,2,opt,name=per_epoch_reward_fraction,json=perEpochRewardFraction,proto3,customtype=github.com/cosmos/cosmos-sdk/types.Dec" json:"per_epoch_reward_fraction" yaml:"discrete_epoch_reward_fraction"`
	// reward_smoothing_blocks is the number of blocks over which to distribute
	// an epoch's rewards.  If zero, use the same value as
	// reward_epoch_duration_blocks.
	RewardSmoothingBlocks int64 `protobuf:"varint,3,opt,name=reward_smoothing_blocks,json=rewardSmoothingBlocks,proto3" json:"reward_smoothing_blocks,omitempty" yaml:"reward_smoothing_blocks"`
}

func (m *Params) Reset()      { *m = Params{} }
func (*Params) ProtoMessage() {}
func (*Params) Descriptor() ([]byte, []int) {
	return fileDescriptor_5e89b3b9e5e671b4, []int{0}
}
func (m *Params) XXX_Unmarshal(b []byte) error {
	return m.Unmarshal(b)
}
func (m *Params) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	if deterministic {
		return xxx_messageInfo_Params.Marshal(b, m, deterministic)
	} else {
		b = b[:cap(b)]
		n, err := m.MarshalToSizedBuffer(b)
		if err != nil {
			return nil, err
		}
		return b[:n], nil
	}
}
func (m *Params) XXX_Merge(src proto.Message) {
	xxx_messageInfo_Params.Merge(m, src)
}
func (m *Params) XXX_Size() int {
	return m.Size()
}
func (m *Params) XXX_DiscardUnknown() {
	xxx_messageInfo_Params.DiscardUnknown(m)
}

var xxx_messageInfo_Params proto.InternalMessageInfo

func (m *Params) GetRewardEpochDurationBlocks() int64 {
	if m != nil {
		return m.RewardEpochDurationBlocks
	}
	return 0
}

func (m *Params) GetRewardSmoothingBlocks() int64 {
	if m != nil {
		return m.RewardSmoothingBlocks
	}
	return 0
}

// The current state of the module.
type State struct {
	// rewardPool is the current balance of rewards in the module account.
	// NOTE: Tracking manually since there is no bank call for getting a
	// module account balance by name.
	RewardPool github_com_cosmos_cosmos_sdk_types.Coins `protobuf:"bytes,1,rep,name=reward_pool,json=rewardPool,proto3,castrepeated=github.com/cosmos/cosmos-sdk/types.Coins" json:"reward_pool" yaml:"reward_pool"`
	// reward_block_amount is the amount of reward, if available, to send to the
	// fee collector module on every block.
	RewardBlockAmount github_com_cosmos_cosmos_sdk_types.Coins `protobuf:"bytes,2,rep,name=reward_block_amount,json=rewardBlockAmount,proto3,castrepeated=github.com/cosmos/cosmos-sdk/types.Coins" json:"reward_block_amount" yaml:"reward_block_amount"`
	// last_sequence is a sequence number for communicating with the VM.
	LastSequence                uint64 `protobuf:"varint,3,opt,name=last_sequence,json=lastSequence,proto3" json:"last_sequence,omitempty" yaml:"last_sequence"`
	LastRewardDistributionBlock int64  `protobuf:"varint,4,opt,name=last_reward_distribution_block,json=lastRewardDistributionBlock,proto3" json:"last_reward_distribution_block,omitempty" yaml:"last_reward_distribution_block"`
}

func (m *State) Reset()         { *m = State{} }
func (m *State) String() string { return proto.CompactTextString(m) }
func (*State) ProtoMessage()    {}
func (*State) Descriptor() ([]byte, []int) {
	return fileDescriptor_5e89b3b9e5e671b4, []int{1}
}
func (m *State) XXX_Unmarshal(b []byte) error {
	return m.Unmarshal(b)
}
func (m *State) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	if deterministic {
		return xxx_messageInfo_State.Marshal(b, m, deterministic)
	} else {
		b = b[:cap(b)]
		n, err := m.MarshalToSizedBuffer(b)
		if err != nil {
			return nil, err
		}
		return b[:n], nil
	}
}
func (m *State) XXX_Merge(src proto.Message) {
	xxx_messageInfo_State.Merge(m, src)
}
func (m *State) XXX_Size() int {
	return m.Size()
}
func (m *State) XXX_DiscardUnknown() {
	xxx_messageInfo_State.DiscardUnknown(m)
}

var xxx_messageInfo_State proto.InternalMessageInfo

func (m *State) GetRewardPool() github_com_cosmos_cosmos_sdk_types.Coins {
	if m != nil {
		return m.RewardPool
	}
	return nil
}

func (m *State) GetRewardBlockAmount() github_com_cosmos_cosmos_sdk_types.Coins {
	if m != nil {
		return m.RewardBlockAmount
	}
	return nil
}

func (m *State) GetLastSequence() uint64 {
	if m != nil {
		return m.LastSequence
	}
	return 0
}

func (m *State) GetLastRewardDistributionBlock() int64 {
	if m != nil {
		return m.LastRewardDistributionBlock
	}
	return 0
}

func init() {
	proto.RegisterType((*Params)(nil), "agoric.vbank.Params")
	proto.RegisterType((*State)(nil), "agoric.vbank.State")
}

func init() { proto.RegisterFile("agoric/vbank/vbank.proto", fileDescriptor_5e89b3b9e5e671b4) }

var fileDescriptor_5e89b3b9e5e671b4 = []byte{
	// 550 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0x94, 0x93, 0x31, 0x6f, 0xd3, 0x40,
	0x14, 0xc7, 0x73, 0x49, 0xa8, 0xe0, 0x5a, 0x06, 0x4c, 0x01, 0x27, 0x20, 0x3b, 0x32, 0x02, 0xc2,
	0x80, 0xad, 0xc2, 0x82, 0x22, 0x31, 0xd4, 0x84, 0x8e, 0xa8, 0x72, 0x06, 0xa4, 0x2e, 0xd1, 0xd9,
	0x39, 0x1c, 0x2b, 0xb6, 0x9f, 0xb9, 0xbb, 0x14, 0xba, 0xf2, 0x09, 0x10, 0x13, 0x6c, 0x9d, 0xf9,
	0x24, 0x1d, 0x3b, 0x22, 0x24, 0x0c, 0x4a, 0x16, 0x16, 0x96, 0x7c, 0x02, 0xe4, 0xbb, 0x8b, 0x9a,
	0x20, 0x54, 0x60, 0x49, 0x7c, 0xfe, 0xbd, 0xf7, 0xfc, 0x7f, 0xff, 0x77, 0x0f, 0x9b, 0x24, 0x06,
	0x96, 0x44, 0xde, 0x61, 0x48, 0xf2, 0x89, 0xfa, 0x75, 0x0b, 0x06, 0x02, 0x8c, 0x2d, 0x45, 0x5c,
	0xf9, 0xae, 0xbd, 0x1d, 0x43, 0x0c, 0x12, 0x78, 0xd5, 0x93, 0x8a, 0x69, 0x5b, 0x11, 0xf0, 0x0c,
	0xb8, 0x17, 0x12, 0x4e, 0xbd, 0xc3, 0x9d, 0x90, 0x0a, 0xb2, 0xe3, 0x45, 0x90, 0xe4, 0x8a, 0x3b,
	0x3f, 0xeb, 0x78, 0x63, 0x9f, 0x30, 0x92, 0x71, 0x63, 0x8c, 0x6f, 0x31, 0xfa, 0x9a, 0xb0, 0xd1,
	0x90, 0x16, 0x10, 0x8d, 0x87, 0xa3, 0x29, 0x23, 0x22, 0x81, 0x7c, 0x18, 0xa6, 0x10, 0x4d, 0xb8,
	0x89, 0x3a, 0xa8, 0xdb, 0xf0, 0xef, 0x2d, 0x4a, 0xfb, 0xf6, 0x11, 0xc9, 0xd2, 0x9e, 0x73, 0x5e,
	0xb4, 0x13, 0xb4, 0x14, 0x7e, 0x56, 0xd1, 0xbe, 0x86, 0xbe, 0x64, 0xc6, 0x7b, 0x84, 0x5b, 0x05,
	0x65, 0x3a, 0x53, 0x97, 0x79, 0xc9, 0x48, 0x54, 0xc5, 0x98, 0xf5, 0x0e, 0xea, 0x5e, 0xf2, 0x5f,
	0x9c, 0x94, 0x76, 0xed, 0x4b, 0x69, 0xdf, 0x8d, 0x13, 0x31, 0x9e, 0x86, 0x6e, 0x04, 0x99, 0xa7,
	0x7b, 0x51, 0x7f, 0x0f, 0xf8, 0x68, 0xe2, 0x89, 0xa3, 0x82, 0x72, 0xb7, 0x4f, 0xa3, 0x45, 0x69,
	0xdf, 0x51, 0xaa, 0x46, 0x09, 0x8f, 0x18, 0x15, 0xf4, 0xcf, 0xd5, 0x9d, 0xe0, 0x7a, 0x41, 0x99,
	0x14, 0x15, 0x48, 0xb2, 0xa7, 0x81, 0x71, 0x80, 0x6f, 0xe8, 0x58, 0x9e, 0x01, 0x88, 0x71, 0x92,
	0xc7, 0xcb, 0xce, 0x1b, 0xb2, 0x73, 0x67, 0x51, 0xda, 0xd6, 0x5a, 0xe7, 0xbf, 0x07, 0x3a, 0xc1,
	0x35, 0x45, 0x06, 0x4b, 0xa0, 0x1a, 0xee, 0x5d, 0xfc, 0x70, 0x6c, 0xd7, 0x7e, 0x1c, 0xdb, 0xc8,
	0xf9, 0xda, 0xc0, 0x17, 0x06, 0x82, 0x08, 0x6a, 0xbc, 0x45, 0x78, 0x53, 0xd7, 0x29, 0x00, 0x52,
	0x13, 0x75, 0x1a, 0xdd, 0xcd, 0x87, 0x2d, 0x57, 0x75, 0xe7, 0x56, 0x03, 0x73, 0xf5, 0xc0, 0xdc,
	0xa7, 0x90, 0xe4, 0xfe, 0x5e, 0xe5, 0xc8, 0xa2, 0xb4, 0x8d, 0x35, 0x0d, 0x55, 0xae, 0xf3, 0xe9,
	0x9b, 0xdd, 0xfd, 0x07, 0x9f, 0xaa, 0x32, 0x3c, 0xc0, 0x2a, 0x73, 0x1f, 0x20, 0x35, 0x3e, 0x22,
	0x7c, 0x55, 0x17, 0x92, 0x2d, 0x0c, 0x49, 0x06, 0xd3, 0x5c, 0x98, 0xf5, 0xbf, 0x89, 0x79, 0xae,
	0xc5, 0xb4, 0xd7, 0xc4, 0xac, 0xd6, 0xf8, 0x3f, 0x51, 0x57, 0x54, 0x05, 0xe9, 0xd7, 0xae, 0xcc,
	0x37, 0x9e, 0xe0, 0xcb, 0x29, 0xe1, 0x62, 0xc8, 0xe9, 0xab, 0x29, 0xcd, 0x23, 0x2a, 0xc7, 0xd0,
	0xf4, 0xcd, 0x45, 0x69, 0x6f, 0xab, 0xaf, 0xae, 0x61, 0x27, 0xd8, 0xaa, 0xce, 0x03, 0x7d, 0x34,
	0x72, 0x6c, 0x49, 0xae, 0xa5, 0x8d, 0x12, 0x2e, 0x58, 0x12, 0x4e, 0xcf, 0xee, 0xa8, 0xd9, 0x94,
	0x63, 0xbd, 0x7f, 0x76, 0x75, 0xce, 0x8f, 0x77, 0x82, 0x9b, 0x55, 0x80, 0xba, 0x36, 0xfd, 0x15,
	0x2c, 0x45, 0xf7, 0x9a, 0xd5, 0x7c, 0xfd, 0xe0, 0x64, 0x66, 0xa1, 0xd3, 0x99, 0x85, 0xbe, 0xcf,
	0x2c, 0xf4, 0x6e, 0x6e, 0xd5, 0x4e, 0xe7, 0x56, 0xed, 0xf3, 0xdc, 0xaa, 0x1d, 0x3c, 0x5e, 0xf1,
	0x62, 0x57, 0xad, 0xb4, 0xda, 0x5f, 0xe9, 0x45, 0x0c, 0x29, 0xc9, 0xe3, 0xa5, 0x49, 0x6f, 0xf4,
	0xb6, 0x4b, 0x87, 0xc2, 0x0d, 0xb9, 0xaa, 0x8f, 0x7e, 0x05, 0x00, 0x00, 0xff, 0xff, 0xbc, 0x95,
	0x56, 0xb1, 0x0a, 0x04, 0x00, 0x00,
}

func (this *Params) Equal(that interface{}) bool {
	if that == nil {
		return this == nil
	}

	that1, ok := that.(*Params)
	if !ok {
		that2, ok := that.(Params)
		if ok {
			that1 = &that2
		} else {
			return false
		}
	}
	if that1 == nil {
		return this == nil
	} else if this == nil {
		return false
	}
	if this.RewardEpochDurationBlocks != that1.RewardEpochDurationBlocks {
		return false
	}
	if !this.PerEpochRewardFraction.Equal(that1.PerEpochRewardFraction) {
		return false
	}
	if this.RewardSmoothingBlocks != that1.RewardSmoothingBlocks {
		return false
	}
	return true
}
func (this *State) Equal(that interface{}) bool {
	if that == nil {
		return this == nil
	}

	that1, ok := that.(*State)
	if !ok {
		that2, ok := that.(State)
		if ok {
			that1 = &that2
		} else {
			return false
		}
	}
	if that1 == nil {
		return this == nil
	} else if this == nil {
		return false
	}
	if len(this.RewardPool) != len(that1.RewardPool) {
		return false
	}
	for i := range this.RewardPool {
		if !this.RewardPool[i].Equal(&that1.RewardPool[i]) {
			return false
		}
	}
	if len(this.RewardBlockAmount) != len(that1.RewardBlockAmount) {
		return false
	}
	for i := range this.RewardBlockAmount {
		if !this.RewardBlockAmount[i].Equal(&that1.RewardBlockAmount[i]) {
			return false
		}
	}
	if this.LastSequence != that1.LastSequence {
		return false
	}
	if this.LastRewardDistributionBlock != that1.LastRewardDistributionBlock {
		return false
	}
	return true
}
func (m *Params) Marshal() (dAtA []byte, err error) {
	size := m.Size()
	dAtA = make([]byte, size)
	n, err := m.MarshalToSizedBuffer(dAtA[:size])
	if err != nil {
		return nil, err
	}
	return dAtA[:n], nil
}

func (m *Params) MarshalTo(dAtA []byte) (int, error) {
	size := m.Size()
	return m.MarshalToSizedBuffer(dAtA[:size])
}

func (m *Params) MarshalToSizedBuffer(dAtA []byte) (int, error) {
	i := len(dAtA)
	_ = i
	var l int
	_ = l
	if m.RewardSmoothingBlocks != 0 {
		i = encodeVarintVbank(dAtA, i, uint64(m.RewardSmoothingBlocks))
		i--
		dAtA[i] = 0x18
	}
	{
		size := m.PerEpochRewardFraction.Size()
		i -= size
		if _, err := m.PerEpochRewardFraction.MarshalTo(dAtA[i:]); err != nil {
			return 0, err
		}
		i = encodeVarintVbank(dAtA, i, uint64(size))
	}
	i--
	dAtA[i] = 0x12
	if m.RewardEpochDurationBlocks != 0 {
		i = encodeVarintVbank(dAtA, i, uint64(m.RewardEpochDurationBlocks))
		i--
		dAtA[i] = 0x8
	}
	return len(dAtA) - i, nil
}

func (m *State) Marshal() (dAtA []byte, err error) {
	size := m.Size()
	dAtA = make([]byte, size)
	n, err := m.MarshalToSizedBuffer(dAtA[:size])
	if err != nil {
		return nil, err
	}
	return dAtA[:n], nil
}

func (m *State) MarshalTo(dAtA []byte) (int, error) {
	size := m.Size()
	return m.MarshalToSizedBuffer(dAtA[:size])
}

func (m *State) MarshalToSizedBuffer(dAtA []byte) (int, error) {
	i := len(dAtA)
	_ = i
	var l int
	_ = l
	if m.LastRewardDistributionBlock != 0 {
		i = encodeVarintVbank(dAtA, i, uint64(m.LastRewardDistributionBlock))
		i--
		dAtA[i] = 0x20
	}
	if m.LastSequence != 0 {
		i = encodeVarintVbank(dAtA, i, uint64(m.LastSequence))
		i--
		dAtA[i] = 0x18
	}
	if len(m.RewardBlockAmount) > 0 {
		for iNdEx := len(m.RewardBlockAmount) - 1; iNdEx >= 0; iNdEx-- {
			{
				size, err := m.RewardBlockAmount[iNdEx].MarshalToSizedBuffer(dAtA[:i])
				if err != nil {
					return 0, err
				}
				i -= size
				i = encodeVarintVbank(dAtA, i, uint64(size))
			}
			i--
			dAtA[i] = 0x12
		}
	}
	if len(m.RewardPool) > 0 {
		for iNdEx := len(m.RewardPool) - 1; iNdEx >= 0; iNdEx-- {
			{
				size, err := m.RewardPool[iNdEx].MarshalToSizedBuffer(dAtA[:i])
				if err != nil {
					return 0, err
				}
				i -= size
				i = encodeVarintVbank(dAtA, i, uint64(size))
			}
			i--
			dAtA[i] = 0xa
		}
	}
	return len(dAtA) - i, nil
}

func encodeVarintVbank(dAtA []byte, offset int, v uint64) int {
	offset -= sovVbank(v)
	base := offset
	for v >= 1<<7 {
		dAtA[offset] = uint8(v&0x7f | 0x80)
		v >>= 7
		offset++
	}
	dAtA[offset] = uint8(v)
	return base
}
func (m *Params) Size() (n int) {
	if m == nil {
		return 0
	}
	var l int
	_ = l
	if m.RewardEpochDurationBlocks != 0 {
		n += 1 + sovVbank(uint64(m.RewardEpochDurationBlocks))
	}
	l = m.PerEpochRewardFraction.Size()
	n += 1 + l + sovVbank(uint64(l))
	if m.RewardSmoothingBlocks != 0 {
		n += 1 + sovVbank(uint64(m.RewardSmoothingBlocks))
	}
	return n
}

func (m *State) Size() (n int) {
	if m == nil {
		return 0
	}
	var l int
	_ = l
	if len(m.RewardPool) > 0 {
		for _, e := range m.RewardPool {
			l = e.Size()
			n += 1 + l + sovVbank(uint64(l))
		}
	}
	if len(m.RewardBlockAmount) > 0 {
		for _, e := range m.RewardBlockAmount {
			l = e.Size()
			n += 1 + l + sovVbank(uint64(l))
		}
	}
	if m.LastSequence != 0 {
		n += 1 + sovVbank(uint64(m.LastSequence))
	}
	if m.LastRewardDistributionBlock != 0 {
		n += 1 + sovVbank(uint64(m.LastRewardDistributionBlock))
	}
	return n
}

func sovVbank(x uint64) (n int) {
	return (math_bits.Len64(x|1) + 6) / 7
}
func sozVbank(x uint64) (n int) {
	return sovVbank(uint64((x << 1) ^ uint64((int64(x) >> 63))))
}
func (m *Params) Unmarshal(dAtA []byte) error {
	l := len(dAtA)
	iNdEx := 0
	for iNdEx < l {
		preIndex := iNdEx
		var wire uint64
		for shift := uint(0); ; shift += 7 {
			if shift >= 64 {
				return ErrIntOverflowVbank
			}
			if iNdEx >= l {
				return io.ErrUnexpectedEOF
			}
			b := dAtA[iNdEx]
			iNdEx++
			wire |= uint64(b&0x7F) << shift
			if b < 0x80 {
				break
			}
		}
		fieldNum := int32(wire >> 3)
		wireType := int(wire & 0x7)
		if wireType == 4 {
			return fmt.Errorf("proto: Params: wiretype end group for non-group")
		}
		if fieldNum <= 0 {
			return fmt.Errorf("proto: Params: illegal tag %d (wire type %d)", fieldNum, wire)
		}
		switch fieldNum {
		case 1:
			if wireType != 0 {
				return fmt.Errorf("proto: wrong wireType = %d for field RewardEpochDurationBlocks", wireType)
			}
			m.RewardEpochDurationBlocks = 0
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				m.RewardEpochDurationBlocks |= int64(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
		case 2:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field PerEpochRewardFraction", wireType)
			}
			var stringLen uint64
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				stringLen |= uint64(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			intStringLen := int(stringLen)
			if intStringLen < 0 {
				return ErrInvalidLengthVbank
			}
			postIndex := iNdEx + intStringLen
			if postIndex < 0 {
				return ErrInvalidLengthVbank
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			if err := m.PerEpochRewardFraction.Unmarshal(dAtA[iNdEx:postIndex]); err != nil {
				return err
			}
			iNdEx = postIndex
		case 3:
			if wireType != 0 {
				return fmt.Errorf("proto: wrong wireType = %d for field RewardSmoothingBlocks", wireType)
			}
			m.RewardSmoothingBlocks = 0
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				m.RewardSmoothingBlocks |= int64(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
		default:
			iNdEx = preIndex
			skippy, err := skipVbank(dAtA[iNdEx:])
			if err != nil {
				return err
			}
			if (skippy < 0) || (iNdEx+skippy) < 0 {
				return ErrInvalidLengthVbank
			}
			if (iNdEx + skippy) > l {
				return io.ErrUnexpectedEOF
			}
			iNdEx += skippy
		}
	}

	if iNdEx > l {
		return io.ErrUnexpectedEOF
	}
	return nil
}
func (m *State) Unmarshal(dAtA []byte) error {
	l := len(dAtA)
	iNdEx := 0
	for iNdEx < l {
		preIndex := iNdEx
		var wire uint64
		for shift := uint(0); ; shift += 7 {
			if shift >= 64 {
				return ErrIntOverflowVbank
			}
			if iNdEx >= l {
				return io.ErrUnexpectedEOF
			}
			b := dAtA[iNdEx]
			iNdEx++
			wire |= uint64(b&0x7F) << shift
			if b < 0x80 {
				break
			}
		}
		fieldNum := int32(wire >> 3)
		wireType := int(wire & 0x7)
		if wireType == 4 {
			return fmt.Errorf("proto: State: wiretype end group for non-group")
		}
		if fieldNum <= 0 {
			return fmt.Errorf("proto: State: illegal tag %d (wire type %d)", fieldNum, wire)
		}
		switch fieldNum {
		case 1:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field RewardPool", wireType)
			}
			var msglen int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				msglen |= int(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if msglen < 0 {
				return ErrInvalidLengthVbank
			}
			postIndex := iNdEx + msglen
			if postIndex < 0 {
				return ErrInvalidLengthVbank
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			m.RewardPool = append(m.RewardPool, types.Coin{})
			if err := m.RewardPool[len(m.RewardPool)-1].Unmarshal(dAtA[iNdEx:postIndex]); err != nil {
				return err
			}
			iNdEx = postIndex
		case 2:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field RewardBlockAmount", wireType)
			}
			var msglen int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				msglen |= int(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if msglen < 0 {
				return ErrInvalidLengthVbank
			}
			postIndex := iNdEx + msglen
			if postIndex < 0 {
				return ErrInvalidLengthVbank
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			m.RewardBlockAmount = append(m.RewardBlockAmount, types.Coin{})
			if err := m.RewardBlockAmount[len(m.RewardBlockAmount)-1].Unmarshal(dAtA[iNdEx:postIndex]); err != nil {
				return err
			}
			iNdEx = postIndex
		case 3:
			if wireType != 0 {
				return fmt.Errorf("proto: wrong wireType = %d for field LastSequence", wireType)
			}
			m.LastSequence = 0
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				m.LastSequence |= uint64(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
		case 4:
			if wireType != 0 {
				return fmt.Errorf("proto: wrong wireType = %d for field LastRewardDistributionBlock", wireType)
			}
			m.LastRewardDistributionBlock = 0
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				m.LastRewardDistributionBlock |= int64(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
		default:
			iNdEx = preIndex
			skippy, err := skipVbank(dAtA[iNdEx:])
			if err != nil {
				return err
			}
			if (skippy < 0) || (iNdEx+skippy) < 0 {
				return ErrInvalidLengthVbank
			}
			if (iNdEx + skippy) > l {
				return io.ErrUnexpectedEOF
			}
			iNdEx += skippy
		}
	}

	if iNdEx > l {
		return io.ErrUnexpectedEOF
	}
	return nil
}
func skipVbank(dAtA []byte) (n int, err error) {
	l := len(dAtA)
	iNdEx := 0
	depth := 0
	for iNdEx < l {
		var wire uint64
		for shift := uint(0); ; shift += 7 {
			if shift >= 64 {
				return 0, ErrIntOverflowVbank
			}
			if iNdEx >= l {
				return 0, io.ErrUnexpectedEOF
			}
			b := dAtA[iNdEx]
			iNdEx++
			wire |= (uint64(b) & 0x7F) << shift
			if b < 0x80 {
				break
			}
		}
		wireType := int(wire & 0x7)
		switch wireType {
		case 0:
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return 0, ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return 0, io.ErrUnexpectedEOF
				}
				iNdEx++
				if dAtA[iNdEx-1] < 0x80 {
					break
				}
			}
		case 1:
			iNdEx += 8
		case 2:
			var length int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return 0, ErrIntOverflowVbank
				}
				if iNdEx >= l {
					return 0, io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				length |= (int(b) & 0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if length < 0 {
				return 0, ErrInvalidLengthVbank
			}
			iNdEx += length
		case 3:
			depth++
		case 4:
			if depth == 0 {
				return 0, ErrUnexpectedEndOfGroupVbank
			}
			depth--
		case 5:
			iNdEx += 4
		default:
			return 0, fmt.Errorf("proto: illegal wireType %d", wireType)
		}
		if iNdEx < 0 {
			return 0, ErrInvalidLengthVbank
		}
		if depth == 0 {
			return iNdEx, nil
		}
	}
	return 0, io.ErrUnexpectedEOF
}

var (
	ErrInvalidLengthVbank        = fmt.Errorf("proto: negative length found during unmarshaling")
	ErrIntOverflowVbank          = fmt.Errorf("proto: integer overflow")
	ErrUnexpectedEndOfGroupVbank = fmt.Errorf("proto: unexpected end of group")
)
