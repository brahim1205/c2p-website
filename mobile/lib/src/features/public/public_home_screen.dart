import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../auth/auth_scope.dart';

class PublicHomeScreen extends StatefulWidget {
  const PublicHomeScreen({required this.authSession, super.key});

  final AuthSession authSession;

  @override
  State<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

class _PublicHomeScreenState extends State<PublicHomeScreen> {
  int _selectedIndex = 0;

  static const _sections = [
    _PublicSection(
      title: 'Centre C2P',
      subtitle: 'Services, formations, projets et paiements dans une experience mobile coherente.',
      items: ['AlloPresta', 'Espace numerique', 'Project Center', 'Paiements securises'],
    ),
    _PublicSection(
      title: 'AlloPresta',
      subtitle: 'Trouvez des prestataires, publiez vos besoins et suivez vos reservations.',
      items: ['Prestataires verifies', 'Demandes suivies', 'Messagerie integree'],
    ),
    _PublicSection(
      title: 'Espace numerique',
      subtitle: 'Formations, classes virtuelles, evaluations, certificats et progression apprenant.',
      items: ['Cours publics', 'Classes virtuelles', 'Replays', 'Certificats'],
    ),
    _PublicSection(
      title: 'Project Center',
      subtitle: 'Soumettez un projet, cherchez des partenaires et suivez les financements.',
      items: ['Soumission projet', 'Partenariats', 'Opportunites', 'Suivi finance'],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final section = _sections[_selectedIndex];
    return Scaffold(
      appBar: AppBar(
        title: const Text('C2P Mobile'),
        actions: [
          TextButton(
            onPressed: () => context.go('/auth/login'),
            child: const Text('Connexion'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(section.title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            Text(section.subtitle, style: const TextStyle(color: C2PColors.ink, height: 1.4)),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _sections.length; i++)
                  ChoiceChip(
                    selected: _selectedIndex == i,
                    label: Text(_sections[i].title),
                    onSelected: (_) => setState(() => _selectedIndex = i),
                  ),
              ],
            ),
            const SizedBox(height: 22),
            ...section.items.map(
              (item) => Card(
                child: ListTile(
                  leading: const Icon(Icons.check_circle_outline, color: C2PColors.blue),
                  title: Text(item, style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: const Text('Module aligne avec le portail web C2P.'),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => context.go('/auth/register'),
              child: const Text('Creer un compte'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => context.go('/auth/login'),
              child: const Text('Se connecter'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PublicSection {
  const _PublicSection({
    required this.title,
    required this.subtitle,
    required this.items,
  });

  final String title;
  final String subtitle;
  final List<String> items;
}
