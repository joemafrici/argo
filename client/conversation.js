export class Conversation {
  constructor(id, participants) {
    this.id = id;
    this.messages = [];
    this.participants = participants;
  }

  addMessage(message) {
    this.messages.push(message);
  }

  getMessages() {
    return this.messages;
  }

  renderMessages(messageListElement) {
    messageListElement.innerHTML = '';

    this.messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message');
      messageElement.dataset.messageID = message.ID;

      const senderElement = document.createElement('span');
      senderElement.classList.add('sender');
      senderElement.textContent = message.From + ': ';

      const contentElement = document.createElement('span');
      contentElement.classList.add('content');
      contentElement.textContent = message.Content;

      const deleteButton = document.createElement('button');
      deleteButton.classList.add('delete-button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', function() {
        deleteMessage(message.ID);
      });

      messageElement.appendChild(senderElement);
      messageElement.appendChild(contentElement);
      messageElement.appendChild(deleteButton);
      messageListElement.appendChild(messageElement);
    });

    messageListElement.scrollTop = messageListElement.scrollHeight;
  }

  // this function seems wrong.... shouldn't be replacing messages
  updateMessages(newMessage) {
    this.messages.push(newMessage);
    this.renderMessages();
  }

  deleteMessage() {
    console.error('this function is not yet implemented');
  }
}
