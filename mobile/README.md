# C2P Mobile

Projet Flutter initial pour la version mobile de C2P.

Objectifs:
- consommer la meme API que le frontend web (`/api`);
- conserver les memes parcours fonctionnels: public, authentification, inscription par profil, dashboards par role;
- garder une coherence UI avec la charte C2P.

## Configuration API

Par defaut:

- Android Emulator: `http://10.0.2.2:3003/api`;
- iOS Simulator, desktop et Flutter web local: `http://127.0.0.1:3003/api`.

Pour viser la production ou un autre environnement:

```bash
flutter run --dart-define=C2P_API_BASE_URL=https://votre-domaine.sn/api
```

Sur un telephone physique, `127.0.0.1` ou `10.0.2.2` ne pointent pas vers votre ordinateur. Utiliser l'adresse IP locale de la machine qui lance le backend:

```bash
flutter run --dart-define=C2P_API_BASE_URL=http://192.168.1.20:3003/api
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
