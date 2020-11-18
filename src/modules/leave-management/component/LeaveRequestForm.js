import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    CButton,
    CCol,
    CFormGroup,
    CTextarea,
    CInput,
    CLabel,
    CSelect,
    CInvalidFeedback,
    CSpinner,
    CAlert,
} from '@coreui/react'
import { Modal } from 'reusable'
import LeaveRequestModel from 'models/LeaveRequestModel'
import { shallowCopy, checkDateRange, toCapitalize, renameKey, dispatchNotification } from 'utils/helpers'
import { useSelector, useDispatch } from 'react-redux'
import { LEAVE_TYPES, LEAVE_REQUEST_FILTER } from 'utils/constants/constant'
import { actionCreator, ActionTypes } from 'utils/actions';
import { retrieveLeaveRequests } from 'utils/helpers/fetch'
import api from 'utils/api'
import _ from 'lodash'
import moment from 'moment';
const LeaveFormRequest = ({ request }) => {
    const invalidRange = 'Invalid date range';
    const limitReached = 'You have reached your maximum number of leave.';

    let _errors = {
        dates: false,
        reason: false,
        category: false
    }
    const dispatch = useDispatch();
    const user = useSelector(state => {
        let authed = state.appState.auth.user;
        return {
            firstname: authed.firstname,
            lastname: authed.lastname,
            employeeId: authed.employeeId,
            userId: authed.userId
        }
    })
    LeaveRequestModel.name = `${toCapitalize(user.firstname)} ${toCapitalize(user.lastname)}`
    LeaveRequestModel.employeeID = user.employeeId
    const modalRef = useRef()
    const [data, setData] = useState(request ? request : LeaveRequestModel)
    const [noOfDays, setNoOfDays] = useState(checkDateRange(data.date_from, data.date_to))
    const [remainingLeave, setRemainingLeave] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState(_errors);
    const [isLimitError, toggleLimitError] = useState(false)
    const [isRangeError, toggleRangeError] = useState(false)
    const validateDate = () => {
        toggleLimitError(false)
        toggleRangeError(false)
        let checkBefore = (date) => {
            if (moment(date).isBefore(moment())) {
                toggleLimitError(false)
                setNoOfDays(invalidRange)
                toggleRangeError(true)
            }
        }
        if (data.date_from !== "") {
            checkBefore(data.date_from)
        }

        if (data.date_to !== "") {
            checkBefore(data.date_to)
        }
        if (data.date_from === "" || data.date_to === "") {
            return setNoOfDays(0)
        }

        let gap = checkDateRange(data.date_from, data.date_to);

        if (gap > 0) {
            if (remainingLeave < gap) {
                toggleRangeError(false)
                toggleLimitError(true)
            }

            return setNoOfDays(gap);
        } else {
            setNoOfDays(invalidRange)
            toggleLimitError(false)
            toggleRangeError(true)
        }
    }

    const validateInfo = async () => {
        let { category, date_from, date_to, reason } = data
        if (category === "" || category === null) {
            _errors.category = true;
        }
        if (date_from === "" || date_to === null || date_to === "" || date_from === "" || noOfDays === invalidRange || isLimitError) {
            _errors.dates = true;
        }

        if (reason === "" || reason === null) {
            _errors.reason = true
        }
        _errors.dates = invalidDate;
        setErrors(_errors);
        if (!Object.values(_errors).includes(true)) {
            handleSubmit()
        }

    }

    const handleOnChange = (e) => {
        let key = e.target.name
        let value = e.target.value
        let copy = shallowCopy(data)
        _errors = shallowCopy(errors)
        _errors[key.includes('date_') ? 'dates' : key] = false;
        setErrors(_errors)
        copy[key] = value
        validateDate()
        setData(copy)
    }
    const invalidDate = useMemo(() => {
        return (noOfDays <= 0 || noOfDays === invalidRange || noOfDays === limitReached)
    }, [noOfDays])

    const modalOnClose = () => {
        setData(LeaveRequestModel)
        _errors = _.mapValues(_errors, () => false);
        setErrors(_errors)
    }

    // const checkErrors = () => {
    //     setHasErrors(hasMissingFieds(data))

    // }
    const checkRemainingLeave = async () => {
        try {
            let res = await api.get(`/checkRemainingLeave/${user.employeeId}`);
            if (res.error) return dispatchNotification(dispatch, { type: 'error', message: res.message });
            setRemainingLeave(res.data.remaining_leave);
            if (res.data.remaining_leave === 0) {
                toggleLimitError(true)
                setNoOfDays(limitReached)
            }
        } catch (error) {
            return dispatchNotification(dispatch, { type: 'error', message: error.toString() })
        }

    }

    const handleSubmit = async () => {
        setIsLoading(true)
        let res = await api.post("/create_request_leave", data)
        if (!res.error) {
            console.log(res.data)
            const { employeeId, roleId } = user;
            let payload = LEAVE_REQUEST_FILTER('All');
            dispatch(actionCreator(ActionTypes.ADD_LEAVE_REQUEST, renameKey(res.data[0])))
            modalRef.current.toggle()
            modalOnClose()
        } else {
            dispatchNotification(dispatch, { type: 'error', message: res.message });
        }
        setIsLoading(false)
    }

    useEffect(() => {
        validateDate()
        checkRemainingLeave();
    }, [data, setNoOfDays])

    const actions = () => (
        <>
            <CButton color="primary" disabled={isLoading || isLimitError} onClick={validateInfo}>
                {
                    isLoading ? <CSpinner color="secondary" size="sm" /> : 'Submit'
                }
            </CButton>
        </>
    )

    return (
        <Modal ref={modalRef} {...{
            title: "Request Leave",
            footer: actions(),
            modalOnClose,
            cancelBtnTitle: "Close",
            size: "lg"
        }}>
            {(isLimitError || isRangeError) && <CAlert color="danger">
                <>
                    {
                        isRangeError && <><strong>Date Criteria : </strong>
                            <ul>
                                <li>Start date must be later than today.</li>
                                <li>Start date and End date must have difference for atleast 1 day.</li>
                            </ul>
                        </>
                    }
                    {
                        isLimitError && <p style={{ margin: '0' }}>{limitReached}</p>
                    }
                </>
            </CAlert>}
            <CFormGroup >
                <CLabel>Name : </CLabel>
                <CInput id="company" value={data.name} disabled />
            </CFormGroup>
            <CFormGroup row className="my-0">
                <CCol xs="6">
                    <CFormGroup >
                        <CLabel htmlFor="date-input">Date From : </CLabel>
                        <CInput
                            type="date"
                            id="date-from"
                            name="date_from"
                            value={data.date_from}
                            onChange={handleOnChange}
                            invalid={errors.dates}
                            placeholder="Date From" />
                    </CFormGroup>
                </CCol>
                <CCol xs="6">
                    <CFormGroup >
                        <CLabel htmlFor="date-input">Date To : </CLabel>
                        <CInput
                            type="date"
                            id="date-to"
                            onChange={handleOnChange}
                            name="date_to"
                            value={data.date_to}
                            invalid={errors.dates}
                            placeholder="Date To" />
                    </CFormGroup>
                </CCol>
            </CFormGroup>
            <CFormGroup row className="my-0">
                <CCol xs="6">
                    <CFormGroup >
                        <CLabel>No of Days : </CLabel>
                        <CInput id="noofdays" value={noOfDays} disabled />
                    </CFormGroup>
                </CCol>
                <CCol xs="6">
                    <CFormGroup>
                        <CLabel htmlFor="Category">Category : </CLabel>
                        <CSelect
                            custom name="category"
                            invalid={errors.category}
                            value={data.category || ""}
                            onChange={handleOnChange}
                            id="category">
                            <option value="" hidden>Please select</option>
                            {LEAVE_TYPES.map((category, idx) => {
                                return <option key={idx} value={category}>{category}</option>
                            })}
                        </CSelect>
                    </CFormGroup>
                </CCol>
            </CFormGroup>


            <CFormGroup>
                <CLabel htmlFor="textarea-input">Reason : </CLabel>
                <CTextarea
                    onChange={handleOnChange}
                    name="reason"
                    value={data.reason}
                    invalid={errors.reason}
                    rows="5"
                />
                <CInvalidFeedback className="help-block">
                    Please provide a valid information
                  </CInvalidFeedback>
            </CFormGroup>
        </Modal>
    )

}
export default LeaveFormRequest