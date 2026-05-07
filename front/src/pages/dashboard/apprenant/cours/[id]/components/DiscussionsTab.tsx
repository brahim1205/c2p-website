import { Course } from '../types';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

interface Props {
  course: Course;
}

interface CommentLike {
  id: number;
  likes: number;
  hasLiked: boolean;
}

export default function DiscussionsTab({ course }: Props) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [localComments, setLocalComments] = useState<Record<number, CommentLike>>(() => {
    const initial: Record<number, CommentLike> = {};
    course.comments.forEach(c => {
      initial[c.id] = { id: c.id, likes: c.likes || 0, hasLiked: false };
    });
    return initial;
  });
  const { success } = useToast();

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    success('Commentaire publié', 'Votre message a été ajouté aux discussions.');
    setNewComment('');
  };

  const handleLike = (commentId: number) => {
    setLocalComments(prev => {
      const current = prev[commentId];
      if (!current) return prev;
      if (current.hasLiked) {
        success('Annulé', 'Vous avez retiré votre like.');
        return {
          ...prev,
          [commentId]: { ...current, likes: Math.max(0, current.likes - 1), hasLiked: false }
        };
      }
      success('Merci !', 'Vous avez aimé ce commentaire.');
      return {
        ...prev,
        [commentId]: { ...current, likes: current.likes + 1, hasLiked: true }
      };
    });
  };

  const handleReply = (commentId: number) => {
    if (!replyText.trim()) return;
    success('Réponse publiée', 'Votre réponse a été ajoutée.');
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      {/* Post comment */}
      <div className="bg-gray-50 rounded-xl p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Posez une question ou partagez votre avis..."
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none bg-white"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{newComment.length}/500</span>
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              newComment.trim()
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Publier
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {course.comments.map((comment) => {
          const localLike = localComments[comment.id];
          return (
            <div key={comment.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl">
              <img src={comment.avatar} alt={comment.user} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{comment.user}</p>
                  <span className="text-xs text-gray-500">{comment.date}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                      localLike?.hasLiked ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'
                    }`}
                  >
                    <i className={`${localLike?.hasLiked ? 'ri-thumb-up-fill' : 'ri-thumb-up-line'}`}></i>
                    {localLike?.likes || comment.likes}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(comment.id); setReplyText(''); }}
                    className="text-xs text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
                  >
                    Répondre
                  </button>
                </div>
                {replyingTo === comment.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Écrivez votre réponse..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                    <button
                      onClick={() => handleReply(comment.id)}
                      className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Répondre
                    </button>
                    <button
                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}