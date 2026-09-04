import { Inject, Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { SubscriberModel, type SubscriberDoc } from './subscriber.schema';

const SUBSCRIBER_MODEL = 'Subscriber';

@Injectable()
export class SubscriberRepository {
  constructor(@Inject(SUBSCRIBER_MODEL) private readonly model: Model<SubscriberDoc> = SubscriberModel) {}

  findAll(): Promise<SubscriberDoc[]> {
    return this.model.find().lean().exec();
  }

  findOneByImsi(imsi: string): Promise<SubscriberDoc | null> {
    return this.model.findOne({ imsi }).lean().exec();
  }

  create(doc: Partial<SubscriberDoc>): Promise<SubscriberDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as SubscriberDoc);
  }

  updateByImsi(imsi: string, update: Partial<SubscriberDoc>): Promise<SubscriberDoc | null> {
    return this.model.findOneAndUpdate({ imsi }, update, { new: true }).lean().exec();
  }

  deleteByImsi(imsi: string): Promise<unknown> {
    return this.model.deleteOne({ imsi }).exec();
  }
}
