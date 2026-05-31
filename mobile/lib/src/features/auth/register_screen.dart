import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../theme/app_theme.dart';
import 'auth_models.dart';
import 'auth_scope.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({required this.authSession, super.key});

  final AuthSession authSession;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _locationController = TextEditingController();
  final _publicTitleController = TextEditingController();
  final _skillsController = TextEditingController();
  final _bioController = TextEditingController();
  String _selectedRole = 'client';
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _locationController.dispose();
    _publicTitleController.dispose();
    _skillsController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.authSession.register(
        email: _emailController.text,
        password: _passwordController.text,
        firstName: _firstNameController.text,
        lastName: _lastNameController.text,
        phone: _phoneController.text,
        role: _selectedRole,
        location: _locationController.text,
        publicTitle: _publicTitleController.text,
        skills: _skillsController.text.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList(),
        bio: _bioController.text,
      );
      if (mounted) context.go('/dashboard');
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Erreur reseau. Veuillez reessayer.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inscription')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Choisissez votre profil', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              ...userRoleOptions.map((role) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _RoleCard(
                      role: role,
                      selected: _selectedRole == role.id,
                      onTap: () => setState(() => _selectedRole = role.id),
                    ),
                  )),
              const SizedBox(height: 14),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: Color(0xFF9B1C1C), fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  Expanded(child: _requiredTextField(_firstNameController, 'Prenom')),
                  const SizedBox(width: 12),
                  Expanded(child: _requiredTextField(_lastNameController, 'Nom')),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) => value == null || !value.contains('@') ? 'Email invalide' : null,
              ),
              const SizedBox(height: 12),
              _requiredTextField(_phoneController, 'Telephone'),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Mot de passe',
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  ),
                ),
                validator: (value) => value == null || value.length < 8 ? '8 caracteres minimum' : null,
              ),
              const SizedBox(height: 18),
              _ProfileFields(
                role: _selectedRole,
                locationController: _locationController,
                publicTitleController: _publicTitleController,
                skillsController: _skillsController,
                bioController: _bioController,
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading ? const CircularProgressIndicator(strokeWidth: 2) : const Text('Creer mon compte'),
              ),
              TextButton(
                onPressed: () => context.go('/auth/login'),
                child: const Text('J ai deja un compte'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  TextFormField _requiredTextField(TextEditingController controller, String label) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(labelText: label),
      validator: (value) => value == null || value.trim().isEmpty ? 'Champ requis' : null,
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.role, required this.selected, required this.onTap});

  final UserRoleOption role;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Card(
        color: selected ? const Color(0xFFEAF4FF) : Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: C2PColors.blue),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(role.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(role.description, style: const TextStyle(color: C2PColors.ink)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileFields extends StatelessWidget {
  const _ProfileFields({
    required this.role,
    required this.locationController,
    required this.publicTitleController,
    required this.skillsController,
    required this.bioController,
  });

  final String role;
  final TextEditingController locationController;
  final TextEditingController publicTitleController;
  final TextEditingController skillsController;
  final TextEditingController bioController;

  bool get _needsProfessionalFields => {'prestataire', 'formateur', 'partenaire'}.contains(role);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (role == 'client' || role == 'prestataire')
          TextFormField(
            controller: locationController,
            decoration: const InputDecoration(labelText: 'Localisation'),
          ),
        if (_needsProfessionalFields) ...[
          const SizedBox(height: 12),
          TextFormField(
            controller: publicTitleController,
            decoration: const InputDecoration(labelText: 'Titre ou metier principal'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: skillsController,
            decoration: const InputDecoration(labelText: 'Competences ou services', hintText: 'Separez par des virgules'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: bioController,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Presentation'),
          ),
        ],
      ],
    );
  }
}
