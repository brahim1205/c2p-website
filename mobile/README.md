# C2P Mobile

Projet Flutter initial pour la version mobile de C2P.

Objectifs:
- consommer la meme API que le frontend web (`/api`);
- conserver les memes parcours fonctionnels: public, authentification, inscription par profil, dashboards par role;
- garder une coherence UI avec la charte C2P.

## Configuration API

Par defaut, l'app pointe vers `http://10.0.2.2:3003/api`, utile pour Android Emulator avec le backend local.

Pour viser la production ou un autre environnement:

```bash
flutter run --dart-define=C2P_API_BASE_URL=https://votre-domaine.sn/api
```

## Initialisation native

Flutter n'etait pas installe sur la machine au moment de la creation. Une fois Flutter installe:

```bash
cd mobile
flutter create .
flutter pub get
flutter analyze
flutter test
```

`flutter create .` generera les dossiers natifs Android/iOS tout en conservant `lib/` et `pubspec.yaml`.
