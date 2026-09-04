import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AccountModel, type AccountDoc } from './account.schema';

@Injectable()
export class AccountRepository {
  constructor(@InjectModel('Account') private readonly model: Model<AccountDoc> = AccountModel) {}

  findAll(): Promise<AccountDoc[]> {
    return this.model.find().lean().exec();
  }

  findOneByUsername(username: string): Promise<AccountDoc | null> {
    return this.model.findOne({ username }).lean().exec();
  }

  create(doc: Partial<AccountDoc>): Promise<AccountDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as AccountDoc);
  }

  updateByUsername(username: string, update: Partial<AccountDoc>): Promise<AccountDoc | null> {
    return this.model.findOneAndUpdate({ username }, update, { new: true }).lean().exec();
  }

  deleteByUsername(username: string): Promise<unknown> {
    return this.model.deleteOne({ username }).exec();
  }
}
