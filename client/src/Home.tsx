import { ConversationProvider } from './contexts/ConversationContext';
import Sidebar from './components/Sidebar';
import Conversation from './components/Conversation';

const Home: React.FC = () => {
  return (
    <ConversationProvider>
      <div className='home'>
        <Sidebar />
        <Conversation />
      </div >
    </ConversationProvider>
  )
}
export default Home
