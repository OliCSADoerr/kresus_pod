import React from 'react';
import { connect } from 'react-redux';

import { get } from '../../../store';
import { translate as $t } from '../../../helpers';
import { EMAILS_ENABLED, NOTIFICATIONS_ENABLED } from '../../../../shared/instance';
import { APPRISE_URL, EMAIL_RECIPIENT } from '../../../../shared/settings';

import Alerts from './alert-list';
import EmailConfig from './email-config';
import NotificationsConfig from './notifications-config';
import Reports from './report-list';
import DisplayIf from '../../ui/display-if';

function EmailsParameters(props) {
    return (
        <div className="emails settings-container">
            <EmailConfig />
            <hr />
            <NotificationsConfig />
            <DisplayIf condition={props.enableEditors}>
                <hr />
                <div>
                    <Alerts
                        alertType="balance"
                        sendIfText={$t('client.settings.emails.send_if_balance_is')}
                        titleTranslationKey="client.settings.emails.add_balance"
                        panelTitleKey="client.settings.emails.balance_title"
                        panelDescriptionKey="client.settings.emails.balance_desc"
                    />

                    <Alerts
                        alertType="transaction"
                        sendIfText={$t('client.settings.emails.send_if_transaction_is')}
                        titleTranslationKey="client.settings.emails.add_transaction"
                        panelTitleKey="client.settings.emails.transaction_title"
                        panelDescriptionKey="client.settings.emails.transaction_desc"
                    />

                    <Reports />
                </div>
            </DisplayIf>
        </div>
    );
}

export default connect(state => {
    // Only enable the editors if emails are enabled and a recipient email
    // address has been set or if notifications are enabled.
    let enableEditors =
        (get.boolInstanceProperty(state, EMAILS_ENABLED) &&
            get.setting(state, EMAIL_RECIPIENT).length > 0) ||
        (get.boolInstanceProperty(state, NOTIFICATIONS_ENABLED) &&
            get.setting(state, APPRISE_URL).length > 0);
    return {
        enableEditors,
    };
})(EmailsParameters);
