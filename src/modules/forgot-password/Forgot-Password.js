import React, { useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CInput,
  CInputGroup,
  CInputGroupPrepend,
  CInputGroupText,
  CRow
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { CenteredLayout } from 'containers';

const ForgotPassword = (props) => {
  let { history } = props;
  let already_logged = useSelector(state => {
    return state.appState.auth.already_logged
  })
  useEffect(() => {
    already_logged && history.push("/")
  }, [])
  return (

    <CenteredLayout>
      <CForm>
        <h1>Forgot Password</h1>
        <CInputGroup className="mb-3 mt-3">
          <CInputGroupPrepend>
            <CInputGroupText>@</CInputGroupText>
          </CInputGroupPrepend>
          <CInput type="email" placeholder="Input registered email" autoComplete="email" />
        </CInputGroup>
        <CButton color="primary" block>Submit</CButton>
        <CRow>
          <CCol xs="6">
          </CCol>
          <CCol xs="6" className="text-right px-0">
            <CButton className="float-right" color="link" onClick={() => {
              history.push("/login")
            }}>Back to Login</CButton>
          </CCol>
        </CRow>
      </CForm>
    </CenteredLayout>
  )
}

export default ForgotPassword
