package pbx

import "errors"

type ErrorCode string

const (
	InvalidEnvelope         ErrorCode = "InvalidEnvelope"
	InvalidAuthentication   ErrorCode = "InvalidAuthentication"
	InvalidSignature        ErrorCode = "InvalidSignature"
	ExpiredRequest          ErrorCode = "ExpiredRequest"
	ReplayDetected          ErrorCode = "ReplayDetected"
	KeyUnwrapFailed         ErrorCode = "KeyUnwrapFailed"
	DecryptionFailed        ErrorCode = "DecryptionFailed"
	InvalidProtobuf         ErrorCode = "InvalidProtobuf"
	InvalidPayload          ErrorCode = "InvalidPayload"
)

type Error struct {
	Code ErrorCode
}

func (e *Error) Error() string { return string(e.Code) }

func NewError(code ErrorCode) error { return &Error{Code: code} }

func IsPbxError(err error) (*Error, bool) {
	var pbxErr *Error
	if errors.As(err, &pbxErr) {
		return pbxErr, true
	}
	return nil, false
}

func PublicMessage(code ErrorCode) string {
	switch code {
	case ExpiredRequest, ReplayDetected:
		return "request rejected"
	case InvalidAuthentication, InvalidSignature, KeyUnwrapFailed, DecryptionFailed:
		return "unauthorized"
	default:
		return "bad request"
	}
}

func PublicStatus(code ErrorCode) int {
	switch code {
	case ExpiredRequest, ReplayDetected, InvalidAuthentication, InvalidSignature, KeyUnwrapFailed, DecryptionFailed:
		return 401
	default:
		return 400
	}
}

const Version = 1
const ContentType = "application/vnd.pbx"
