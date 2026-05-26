import { getAttentionBadge, getStatusBadge, type Enrollment } from './apprenantsModel';

export default function LearnerIdentity({ student, size }: { student: Enrollment; size: 'sm' | 'lg' }) {
  const imageClass = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs';
  return (
    <div className="flex items-center gap-3">
      {student.student_avatar ? (
        <img src={student.student_avatar} alt={student.student_name} className={`${imageClass} flex-shrink-0 rounded-full object-cover`} />
      ) : (
        <div className={`${imageClass} flex items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700`}>
          {student.student_name.charAt(0)}
        </div>
      )}
      <div>
        <p className={`${size === 'lg' ? 'text-xl' : 'text-sm'} font-bold text-gray-900`}>{student.student_name}</p>
        <p className="text-xs text-gray-500">{student.student_email || '-'}</p>
        {size === 'lg' ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {getAttentionBadge(student.attention_level)}
            {getStatusBadge(student.status)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
