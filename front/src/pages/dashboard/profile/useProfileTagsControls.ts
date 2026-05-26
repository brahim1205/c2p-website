import { useState, type Dispatch, type SetStateAction } from 'react';
import type { ProfileFormData } from './components/profileTypes';

type ProfileTagsControlsArgs = {
  formData: ProfileFormData;
  setFormData: Dispatch<SetStateAction<ProfileFormData>>;
};

export function useProfileTagsControls({
  formData,
  setFormData,
}: ProfileTagsControlsArgs) {
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((item) => item !== skill) });
  };

  const addLanguage = () => {
    if (langInput.trim() && !formData.languages.includes(langInput.trim())) {
      setFormData({ ...formData, languages: [...formData.languages, langInput.trim()] });
      setLangInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({ ...formData, languages: formData.languages.filter((item) => item !== lang) });
  };

  return {
    addLanguage,
    addSkill,
    langInput,
    removeLanguage,
    removeSkill,
    setLangInput,
    setSkillInput,
    skillInput,
  };
}
