import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { get, actions } from '../../store';
import { displayLabel, translate as $t } from '../../helpers';
import URL from '../../urls';

import ColoredAmount from './colored-amount';
import DisplayIf from '../ui/display-if';

const AccountListItem = connect(
    (state, props) => {
        return {
            account: get.accountById(state, props.accountId),
            isSmallScreen: get.isSmallScreen(state),
        };
    },
    dispatch => {
        return {
            hideMenu() {
                actions.toggleMenu(dispatch, true);
            },
        };
    }
)(props => {
    let { pathname } = useLocation();
    let { currentAccountId = null } = useParams();
    let { account, accountId, isSmallScreen, hideMenu } = props;
    let { balance, outstandingSum, formatCurrency } = account;

    let newPathname =
        currentAccountId !== null
            ? pathname.replace(currentAccountId, accountId)
            : URL.reports.url(accountId);

    let handleHideMenu = isSmallScreen ? hideMenu : null;

    return (
        <li key={`account-details-account-list-item-${accountId}`} onClick={handleHideMenu}>
            <NavLink to={newPathname} activeClassName="active">
                <span>{displayLabel(account)}</span>
                &ensp;
                <ColoredAmount amount={balance} formatCurrency={formatCurrency} />
                <DisplayIf condition={outstandingSum !== 0}>
                    &ensp;
                    {`(${$t('client.menu.outstanding_sum')}: `}
                    <ColoredAmount amount={outstandingSum} formatCurrency={formatCurrency} />
                    {')'}
                </DisplayIf>
            </NavLink>
        </li>
    );
});

AccountListItem.propTypes = {
    // The account unique id.
    accountId: PropTypes.number.isRequired,
};

export default AccountListItem;
