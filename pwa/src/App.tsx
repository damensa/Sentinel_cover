import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SelectionPage } from './pages/SelectionPage';
import { ConversationPage } from './pages/ConversationPage';
import { ReviewPage } from './pages/ReviewPage';
import { SubmitPage } from './pages/SubmitPage';
import './App.css';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
        <Route path="/conversation/:sessionId" element={<ConversationPage />} />
        <Route path="/review/:sessionId" element={<ReviewPage />} />
        <Route path="/submit/:sessionId" element={<SubmitPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
