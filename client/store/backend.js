import { translate as $t } from '../helpers';
import { hasForbiddenOrMissingField, hasForbiddenField } from '../../shared/validators';

/**
 * Build a promise to fetch data from the API, with minor post-processing.
 * Takes the same parameters as the fetch API.
 *
 * @param {string} url      The URL of the endpoint.
 * @param {object} options  An object containing options.
 * @return {Promise} A Fetch Promise.
 */
function buildFetchPromise(url, options = {}) {
    if (!options.credentials) {
        // Send credentials in case the API is behind an HTTP auth
        options.credentials = 'include';
    }

    let isOk = null;
    let isJson = false;
    return fetch(url, options)
        .then(
            response => {
                isOk = response.ok;
                let contentTypeHeader = response.headers.get('Content-Type');
                isJson = contentTypeHeader && contentTypeHeader.includes('json');
                return response;
            },
            e => {
                let message = e.message;
                let shortMessage = message;
                if (message && message.includes('NetworkError')) {
                    message = shortMessage = $t('client.general.network_error');
                }
                return Promise.reject({
                    code: null,
                    message,
                    shortMessage,
                });
            }
        )
        .then(response => response.text())
        .then(body => {
            if (!isJson) {
                return body;
            }

            // Do the JSON parsing ourselves. Otherwise, we cannot access the
            // raw text in case of a JSON decode error nor can we only decode
            // if the body is not empty.
            try {
                if (body) {
                    return JSON.parse(body);
                }
                return {};
            } catch (e) {
                return Promise.reject({
                    code: null,
                    message: e.message,
                    shortMessage: $t('client.general.json_parse_error'),
                });
            }
        })
        .then(bodyOrJson => {
            // If the initial response status code wasn't in the 200 family,
            // the JSON describes an error.
            if (!isOk) {
                return Promise.reject({
                    code: bodyOrJson.code,
                    message: bodyOrJson.message || '?',
                    shortMessage: bodyOrJson.shortMessage || bodyOrJson.message || '?',
                });
            }
            return bodyOrJson;
        });
}

export function init() {
    return buildFetchPromise('api/all/', { cache: 'no-cache' });
}

export function deleteOperation(opId) {
    return buildFetchPromise(`api/operations/${opId}`, {
        method: 'DELETE',
    });
}

export function updateAccount(accountId, newFields) {
    let error = hasForbiddenField(newFields, ['excludeFromBalance', 'customLabel']);
    if (error) {
        alert(`Developer error when updating an account: ${error}`);
        return;
    }

    return buildFetchPromise(`api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFields),
    });
}

export function resyncBalance(accountId) {
    return buildFetchPromise(`api/accounts/${accountId}/resync-balance`).then(
        data => data.initialBalance
    );
}

export function deleteAccount(accountId) {
    return buildFetchPromise(`api/accounts/${accountId}`, {
        method: 'DELETE',
    });
}

export function createAlert(newAlert) {
    return buildFetchPromise('api/alerts/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAlert),
    });
}

export function updateAlert(alertId, attributes) {
    return buildFetchPromise(`api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributes),
    });
}

export function deleteAlert(alertId) {
    return buildFetchPromise(`api/alerts/${alertId}`, {
        method: 'DELETE',
    });
}

export function updateOperation(id, newOp) {
    return buildFetchPromise(`api/operations/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOp),
    });
}

export function setCategoryForOperation(operationId, categoryId) {
    return updateOperation(operationId, { categoryId });
}

export function setTypeForOperation(operationId, type) {
    return updateOperation(operationId, { type });
}

export function setCustomLabel(operationId, customLabel) {
    return updateOperation(operationId, { customLabel });
}

export function setOperationBudgetDate(operationId, budgetDate) {
    return updateOperation(operationId, { budgetDate });
}

export function mergeOperations(toKeepId, toRemoveId) {
    return buildFetchPromise(`api/operations/${toKeepId}/mergeWith/${toRemoveId}`, {
        method: 'PUT',
    });
}

export function createOperation(operation) {
    return buildFetchPromise('api/operations/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
    });
}

export function updateWeboob() {
    return buildFetchPromise('api/instance/weboob/', {
        method: 'PUT',
    });
}

export function fetchWeboobVersion() {
    return buildFetchPromise('api/instance/weboob');
}

export function importInstance(data, maybePassword) {
    return buildFetchPromise('api/all/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data,
            encrypted: !!maybePassword,
            passphrase: maybePassword,
        }),
    });
}

export function importOFX(data) {
    return buildFetchPromise('api/all/import/ofx', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: data,
    });
}

export function exportInstance(maybePassword) {
    return buildFetchPromise('api/all/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            encrypted: !!maybePassword,
            passphrase: maybePassword,
        }),
    });
}

export function saveSetting(key, value) {
    return buildFetchPromise('api/settings/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
    });
}

export function sendTestEmail(email) {
    return buildFetchPromise('api/instance/test-email/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });
}

export function sendTestNotification(appriseUrl) {
    return buildFetchPromise('api/instance/test-notification/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appriseUrl }),
    });
}

export function createAccess(vendorId, login, password, customFields, customLabel) {
    let data = {
        vendorId,
        login,
        password,
        customLabel,
        fields: customFields,
    };

    return buildFetchPromise('api/accesses/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}

export function updateAccess(accessId, update) {
    let error = hasForbiddenField(update, ['enabled', 'customLabel']);
    if (error) {
        alert(`Developer error when updating an access: ${error}`);
        return;
    }

    return buildFetchPromise(`api/accesses/${accessId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
    });
}

export function updateAndFetchAccess(accessId, access) {
    let error = hasForbiddenField(access, ['login', 'password', 'customFields']);
    if (error) {
        alert(`Developer error when updating an access: ${error}`);
        return;
    }

    // Transform the customFields update to the server's format.
    let { customFields, ...rest } = access;
    let data = { fields: customFields, ...rest };

    return buildFetchPromise(`api/accesses/${accessId}/fetch/accounts`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}

export function getNewAccounts(accessId) {
    return buildFetchPromise(`api/accesses/${accessId}/fetch/accounts`);
}

export function getNewOperations(accessId) {
    return buildFetchPromise(`api/accesses/${accessId}/fetch/operations`);
}

export function deleteAccess(accessId) {
    return buildFetchPromise(`api/accesses/${accessId}`, {
        method: 'DELETE',
    });
}

export function addCategory(category) {
    let error = hasForbiddenOrMissingField(category, ['label', 'color']);
    if (error) {
        alert(`Developer error when adding a category: ${error}`);
        return;
    }

    return buildFetchPromise('api/categories/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    });
}

export function updateCategory(id, category) {
    let error = hasForbiddenField(category, ['label', 'color']);
    if (error) {
        alert(`Developer error when updating a category: ${error}`);
        return;
    }

    return buildFetchPromise(`api/categories/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    });
}

export function deleteCategory(categoryId, replaceByCategoryId) {
    return buildFetchPromise(`api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replaceByCategoryId }),
    });
}

export function fetchBudgets(year, month) {
    return buildFetchPromise(`api/budgets/${year}/${month}`);
}

export function updateBudget(budget) {
    const { categoryId, year, month } = budget;
    return buildFetchPromise(`api/budgets/${categoryId}/${year}/${month}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(budget),
    });
}

export function fetchLogs() {
    return buildFetchPromise('api/logs');
}

export function clearLogs() {
    return buildFetchPromise('api/logs', {
        method: 'DELETE',
    });
}

export function enableDemoMode() {
    return buildFetchPromise('api/demo', {
        method: 'POST',
    });
}

export function disableDemoMode() {
    return buildFetchPromise('api/demo', {
        method: 'DELETE',
    });
}
