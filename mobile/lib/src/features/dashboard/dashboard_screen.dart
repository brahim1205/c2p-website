import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../auth/auth_models.dart';
import '../auth/auth_scope.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({required this.authSession, super.key});

  final AuthSession authSession;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<AuthUser?> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = widget.authSession.user == null
        ? widget.authSession.restore()
        : Future.value(widget.authSession.user);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AuthUser?>(
      future: _userFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final user = snapshot.data;
        if (user == null) {
          return _UnauthenticatedDashboard(onLogin: () => context.go('/auth/login'));
        }

        final modules = _modulesForRole(user.role);
        return Scaffold(
          appBar: AppBar(
            title: Text(_dashboardTitle(user.role)),
            actions: [
              IconButton(
                tooltip: 'Se deconnecter',
                onPressed: () async {
                  await widget.authSession.logout();
                  if (context.mounted) context.go('/auth/login');
                },
                icon: const Icon(Icons.logout),
              ),
            ],
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Card(
                  color: const Color(0xFFEAF4FF),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Bonjour ${user.displayName}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 6),
                        Text('Role: ${user.role}', style: const TextStyle(color: C2PColors.ink)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text('Modules disponibles', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 10),
                ...modules.map((module) => Card(
                      child: ListTile(
                        leading: Icon(module.icon, color: C2PColors.blue),
                        title: Text(module.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: Text(module.description),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _showComingSoon(context, module.title),
                      ),
                    )),
              ],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: 0,
            destinations: const [
              NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Accueil'),
              NavigationDestination(icon: Icon(Icons.message_outlined), label: 'Messages'),
              NavigationDestination(icon: Icon(Icons.payments_outlined), label: 'Paiements'),
              NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Compte'),
            ],
          ),
        );
      },
    );
  }

  void _showComingSoon(BuildContext context, String title) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$title sera branche module par module sur les endpoints web existants.')),
    );
  }

  String _dashboardTitle(String role) {
    return switch (role) {
      'admin' => 'Administration',
      'superadmin' => 'Superadmin',
      'formateur' => 'Dashboard formateur',
      'apprenant' => 'Dashboard apprenant',
      'prestataire' => 'Dashboard prestataire',
      'porteur' => 'Dashboard porteur',
      'partenaire' => 'Dashboard partenaire',
      _ => 'Dashboard client',
    };
  }

  List<_DashboardModule> _modulesForRole(String role) {
    final common = [
      const _DashboardModule('Messages', 'Conversations et notifications.', Icons.message_outlined),
      const _DashboardModule('Paiements', 'Transactions, factures et solde.', Icons.payments_outlined),
      const _DashboardModule('Parametres', 'Profil, securite et preferences.', Icons.settings_outlined),
    ];

    return switch (role) {
      'formateur' => [
          const _DashboardModule('Mes formations', 'Creation, brouillons, programmes et publication.', Icons.video_library_outlined),
          const _DashboardModule('Classes virtuelles', 'Sessions live, replays et acces apprenants.', Icons.live_tv_outlined),
          const _DashboardModule('Evaluations', 'Quiz, devoirs, corrections et notes.', Icons.fact_check_outlined),
          ...common,
        ],
      'apprenant' => [
          const _DashboardModule('Mes cours', 'Cours achetes, progression et replays.', Icons.school_outlined),
          const _DashboardModule('Examens', 'Evaluations, resultats et certificats.', Icons.assignment_outlined),
          ...common,
        ],
      'prestataire' => [
          const _DashboardModule('Services', 'Catalogue de prestations.', Icons.work_outline),
          const _DashboardModule('Demandes', 'Demandes clients et reservations.', Icons.event_available_outlined),
          const _DashboardModule('Avis', 'Reputation et retours clients.', Icons.star_outline),
          ...common,
        ],
      'porteur' => [
          const _DashboardModule('Mes projets', 'Soumission, brouillons et suivi.', Icons.lightbulb_outline),
          const _DashboardModule('Partenariats', 'Mises en relation et opportunites.', Icons.handshake_outlined),
          const _DashboardModule('Financements', 'Demandes et suivi financier.', Icons.account_balance_outlined),
          ...common,
        ],
      'partenaire' => [
          const _DashboardModule('Opportunites', 'Projets a financer ou accompagner.', Icons.travel_explore_outlined),
          const _DashboardModule('Projets suivis', 'Pipeline et collaborations.', Icons.folder_open_outlined),
          ...common,
        ],
      'admin' || 'superadmin' => [
          const _DashboardModule('Utilisateurs', 'Roles, statuts et gouvernance.', Icons.group_outlined),
          const _DashboardModule('Operations', 'Outbox, logs, maintenance et monitoring.', Icons.tune_outlined),
          const _DashboardModule('Finance', 'Provider, transactions et reconciliation.', Icons.account_balance_wallet_outlined),
          const _DashboardModule('Securite', 'Audit, alertes et sauvegardes.', Icons.security_outlined),
          ...common,
        ],
      _ => [
          const _DashboardModule('Prestataires', 'Recherche et demandes de service.', Icons.person_search_outlined),
          const _DashboardModule('Reservations', 'Suivi des rendez-vous et commandes.', Icons.calendar_month_outlined),
          ...common,
        ],
    };
  }
}

class _UnauthenticatedDashboard extends StatelessWidget {
  const _UnauthenticatedDashboard({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 48, color: C2PColors.blue),
              const SizedBox(height: 16),
              const Text('Connexion requise', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
              const SizedBox(height: 8),
              const Text('Connectez-vous pour acceder a votre espace C2P mobile.', textAlign: TextAlign.center),
              const SizedBox(height: 20),
              ElevatedButton(onPressed: onLogin, child: const Text('Se connecter')),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardModule {
  const _DashboardModule(this.title, this.description, this.icon);

  final String title;
  final String description;
  final IconData icon;
}
