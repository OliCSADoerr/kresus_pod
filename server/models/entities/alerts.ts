import {
    getRepository,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    JoinColumn,
    ManyToOne,
    Repository,
} from 'typeorm';

import { Transaction, Account, User } from '../';

import { assert, formatDate, translate as $t, unwrap } from '../../helpers';
import { ForceNumericColumn, DatetimeType } from '../helpers';

@Entity('alert')
export default class Alert {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { cascade: true, onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    user!: User;

    @Column('integer')
    userId!: number;

    // Account related to the alert.
    @ManyToOne(() => Account, { cascade: true, onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    account!: Account;

    @Column('integer')
    accountId!: number;

    // Alert type. Possible options are: report, balance, transaction.
    @Column('varchar')
    type!: string;

    // Frequency, for reports : daily, weekly, monthly.
    @Column('varchar', { nullable: true, default: null })
    frequency: string | null = null;

    // Threshold value, for balance/transaction alerts.
    @Column('numeric', { nullable: true, default: null, transformer: new ForceNumericColumn() })
    limit: number | null = null;

    // Ordering, for balance/transaction alerts: gt, lt.
    @Column('varchar', { nullable: true, default: null })
    order: string | null = null;

    // When did the alert get triggered for the last time?
    @Column({ type: DatetimeType, nullable: true, default: null })
    lastTriggeredDate: Date | null = null;

    // Methods.

    testTransaction(operation: Transaction): boolean {
        if (this.type !== 'transaction') {
            return false;
        }
        assert(this.limit !== null, 'limit must be set for testTransaction');
        const amount = Math.abs(operation.amount);
        return (
            (this.order === 'lt' && amount <= this.limit) ||
            (this.order === 'gt' && amount >= this.limit)
        );
    }

    testBalance(balance: number): boolean {
        if (this.type !== 'balance') {
            return false;
        }
        assert(this.limit !== null, 'limit must be set for testBalance');
        return (
            (this.order === 'lt' && balance <= this.limit) ||
            (this.order === 'gt' && balance >= this.limit)
        );
    }

    formatOperationMessage(
        operation: Transaction,
        accountName: string,
        formatCurrency: (x: number) => string
    ): string {
        const cmp =
            this.order === 'lt'
                ? $t('server.alert.operation.lessThan')
                : $t('server.alert.operation.greaterThan');

        const amount = formatCurrency(operation.amount);
        const date = formatDate.toShortString(operation.date);

        assert(this.limit !== null, 'limit must be set for formatOperationMessage');
        const limit = formatCurrency(this.limit);

        return $t('server.alert.operation.content', {
            label: operation.label,
            account: accountName,
            amount,
            cmp,
            date,
            limit,
        });
    }

    formatAccountMessage(
        label: string,
        balance: number,
        formatCurrency: (x: number) => string
    ): string {
        const cmp =
            this.order === 'lt'
                ? $t('server.alert.balance.lessThan')
                : $t('server.alert.balance.greaterThan');

        assert(this.limit !== null, 'limit must be set for formatAccountMessage');
        const limit = formatCurrency(this.limit);
        const formattedBalance = formatCurrency(balance);

        return $t('server.alert.balance.content', {
            label,
            cmp,
            limit,
            balance: formattedBalance,
        });
    }

    // Static methods
    static async byAccountAndType(
        userId: number,
        accountId: number,
        type: string
    ): Promise<Alert[]> {
        return await repo().find({ userId, accountId, type });
    }

    static async reportsByFrequency(userId: number, frequency: string): Promise<Alert[]> {
        return await repo().find({ where: { userId, type: 'report', frequency } });
    }

    static async destroyByAccount(userId: number, accountId: number): Promise<void> {
        await repo().delete({ userId, accountId });
    }

    static async find(userId: number, alertId: number): Promise<Alert | undefined> {
        return await repo().findOne({ where: { id: alertId, userId } });
    }

    static async exists(userId: number, alertId: number): Promise<boolean> {
        const found = await Alert.find(userId, alertId);
        return !!found;
    }

    static async all(userId: number): Promise<Alert[]> {
        return await repo().find({ userId });
    }

    static async create(userId: number, attributes: Partial<Alert>): Promise<Alert> {
        const alert = repo().create({ userId, ...attributes });
        return await repo().save(alert);
    }

    static async destroy(userId: number, alertId: number): Promise<void> {
        await repo().delete({ id: alertId, userId });
    }

    static async destroyAll(userId: number): Promise<void> {
        await repo().delete({ userId });
    }

    static async update(userId: number, alertId: number, fields: Partial<Alert>): Promise<Alert> {
        await repo().update({ userId, id: alertId }, fields);
        return unwrap(await Alert.find(userId, alertId));
    }
}

let REPO: Repository<Alert> | null = null;
function repo(): Repository<Alert> {
    if (REPO === null) {
        REPO = getRepository(Alert);
    }
    return REPO;
}
