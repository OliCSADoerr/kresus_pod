import regexEscape from 'regex-escape';

import { makeLogger } from '../helpers';
import { ConfigGhostSettings } from '../lib/instance';
import DefaultSettings from '../shared/default-settings';
import { DEFAULT_ACCOUNT_ID } from '../../shared/settings';

import { Setting } from '../models';

const log = makeLogger('controllers/helpers');

export type Remapping = { [key: number]: number };

// Sync function
export function cleanData(world: any) {
    const accessMap: Remapping = {};
    let nextAccessId = 0;

    world.accesses = world.accesses || [];
    for (const a of world.accesses) {
        accessMap[a.id] = nextAccessId;
        a.id = nextAccessId++;
    }

    const accountMap: Remapping = {};
    let nextAccountId = 0;
    world.accounts = world.accounts || [];
    for (const a of world.accounts) {
        a.accessId = accessMap[a.accessId];
        accountMap[a.id] = nextAccountId;
        a.id = nextAccountId++;
    }

    const categoryMap: Remapping = {};
    let nextCatId = 0;
    world.categories = world.categories || [];
    for (const c of world.categories) {
        categoryMap[c.id] = nextCatId;
        c.id = nextCatId++;
    }

    world.budgets = world.budgets || [];
    for (const b of world.budgets) {
        if (typeof categoryMap[b.categoryId] === 'undefined') {
            log.warn(`unexpected category id for a budget: ${b.categoryId}`);
        } else {
            b.categoryId = categoryMap[b.categoryId];
        }

        delete b.id;
    }

    world.operations = world.operations || [];
    for (const o of world.operations) {
        if (o.categoryId !== null) {
            const cid = o.categoryId;
            if (typeof categoryMap[cid] === 'undefined') {
                log.warn(`unexpected category id for a transaction: ${cid}`);
            } else {
                o.categoryId = categoryMap[cid];
            }
        }

        o.accountId = accountMap[o.accountId];

        // Strip away id.
        delete o.id;

        // Remove attachments, if there are any.
        delete o.attachments;
        delete o.binary;
    }

    world.settings = world.settings || [];
    const settings: Setting[] = [];
    for (const s of world.settings) {
        if (!DefaultSettings.has(s.key)) {
            log.warn(`Not exporting setting "${s.key}", it does not have a default value.`);
            continue;
        }

        if (ConfigGhostSettings.has(s.key)) {
            // Don't export ghost settings, since they're computed at runtime.
            continue;
        }

        delete s.id;

        // Properly save the default account id if it exists.
        if (s.key === DEFAULT_ACCOUNT_ID && s.value !== DefaultSettings.get(DEFAULT_ACCOUNT_ID)) {
            const accountId = s.value;
            if (typeof accountMap[accountId] === 'undefined') {
                log.warn(`unexpected default account id: ${accountId}`);
                continue;
            } else {
                s.value = accountMap[accountId];
            }
        }

        settings.push(s);
    }
    world.settings = settings;

    world.alerts = world.alerts || [];
    for (const a of world.alerts) {
        a.accountId = accountMap[a.accountId];
        delete a.id;
    }

    return world;
}

export function obfuscatePasswords(string: string, passwords: Set<string>) {
    // Prevents the application of the regexp s//*******/g
    if (!passwords.size) {
        return string;
    }

    const regex = [...passwords].map(k => regexEscape(`${k}`)).join('|');

    // Always return a fixed width string
    return string.replace(new RegExp(`(${regex})`, 'gm'), '********');
}

export function obfuscateKeywords(string: string, keywords: Set<string>) {
    // Prevents the application of the regexp s//*******/g
    if (!keywords.size) {
        return string;
    }
    const regex = [...keywords].map(k => regexEscape(`${k}`)).join('|');
    return string.replace(new RegExp(`(${regex})`, 'gm'), (_all, keyword) =>
        keyword.substr(-3).padStart(keyword.length, '*')
    );
}
