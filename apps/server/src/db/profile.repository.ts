import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ProfileModel, type ProfileDoc } from './profile.schema';

@Injectable()
export class ProfileRepository {
  constructor(@InjectModel('Profile') private readonly model: Model<ProfileDoc> = ProfileModel) {}

  findAll(): Promise<ProfileDoc[]> {
    return this.model.find().lean().exec();
  }

  findOneByTitle(title: string): Promise<ProfileDoc | null> {
    return this.model.findOne({ title }).lean().exec();
  }

  create(doc: Partial<ProfileDoc>): Promise<ProfileDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as ProfileDoc);
  }

  updateByTitle(title: string, update: Partial<ProfileDoc>): Promise<ProfileDoc | null> {
    return this.model.findOneAndUpdate({ title }, update, { new: true }).lean().exec();
  }

  deleteByTitle(title: string): Promise<unknown> {
    return this.model.deleteOne({ title }).exec();
  }
}
