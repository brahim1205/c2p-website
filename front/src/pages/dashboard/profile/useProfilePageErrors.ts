import { useEffect } from 'react';

type ToastErrorFn = (title: string, message?: string) => void;

type QueryErrorState = {
  error: unknown;
  isError: boolean;
};

type ProfilePageErrorsArgs = {
  error: ToastErrorFn;
  partnerPublicQuery: QueryErrorState;
  porteurPublicQuery: QueryErrorState;
  profileQuery: QueryErrorState;
};

export function useProfilePageErrors({
  error,
  partnerPublicQuery,
  porteurPublicQuery,
  profileQuery,
}: ProfilePageErrorsArgs) {
  useEffect(() => {
    if (profileQuery.isError) {
      console.error(profileQuery.error);
      error('Erreur', 'Impossible de charger votre profil.');
    }
  }, [error, profileQuery.error, profileQuery.isError]);

  useEffect(() => {
    if (porteurPublicQuery.isError) {
      console.error(porteurPublicQuery.error);
      error('Erreur', 'Impossible de charger votre profil public porteur.');
    }
  }, [error, porteurPublicQuery.error, porteurPublicQuery.isError]);

  useEffect(() => {
    if (partnerPublicQuery.isError) {
      console.error(partnerPublicQuery.error);
      error('Erreur', 'Impossible de charger votre profil public partenaire.');
    }
  }, [error, partnerPublicQuery.error, partnerPublicQuery.isError]);
}
