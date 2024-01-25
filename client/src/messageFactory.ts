import { v4 as uuidv4 } from 'uuid';
import { Message } from './types'

function messageFactory(overrides?: Partial<Message>): Message {
  const defaultMessage: Message = {
    ID: uuidv4(),
    ConvID: 'defaultConvID',
    To: 'testuser',
    From: 'otheruser',
    Content: 'Hello there',
    Timestamp: new Date(),
  };

  return {
    ...defaultMessage,
    ...overrides,
  };
}

export default messageFactory;
