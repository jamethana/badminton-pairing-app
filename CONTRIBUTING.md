# 🤝 Contributing to Badminton Pairing App

Thank you for your interest in contributing to the Badminton Pairing App! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Questions and Discussion](#questions-and-discussion)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- A GitHub account

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/badminton-pairing-app.git
   cd badminton-pairing-app
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream git@github.com:jamethana/badminton-pairing-app.git
   ```

## 🔧 Development Setup

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`.

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Build for Production

```bash
npm run build
```

## ✏️ Making Changes

### Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Make Your Changes

1. **Write your code** following the [Code Style](#code-style) guidelines
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Ensure all tests pass**

### Test Your Changes

```bash
npm test
npm run build
```

## 🧪 Testing

### Writing Tests

- Write tests for all new functionality
- Use descriptive test names
- Follow the existing test patterns
- Aim for high test coverage

### Test Structure

```javascript
describe('ComponentName', () => {
  test('should render correctly', () => {
    // Test implementation
  });

  test('should handle user interactions', () => {
    // Test implementation
  });
});
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- ComponentName.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should render"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
2. **Update documentation** if needed
3. **Follow the commit guidelines**
4. **Test your changes thoroughly**

### Submit Your PR

1. **Push your branch** to your fork
2. **Create a Pull Request** against the `main` branch
3. **Fill out the PR template** completely
4. **Link any related issues**

### PR Review Process

1. **Automated checks** will run (CI, tests, linting)
2. **Maintainers will review** your code
3. **Address any feedback** or requested changes
4. **Once approved**, your PR will be merged

## 🎨 Code Style

### JavaScript/React

- Use **ES6+** features
- Prefer **functional components** with hooks
- Use **destructuring** when appropriate
- Follow **React best practices**

### CSS

- Use **CSS custom properties** for theming
- Follow **BEM methodology** for class naming
- Use **flexbox and grid** for layouts
- Ensure **responsive design**

### File Naming

- **Components**: PascalCase (e.g., `PlayerCard.js`)
- **Utilities**: camelCase (e.g., `helpers.js`)
- **Hooks**: camelCase with `use` prefix (e.g., `useLocalStorage.js`)
- **Tests**: Same as source file with `.test.js` suffix

### Code Organization

```javascript
// 1. Imports
import React from 'react';

// 2. Component definition
const ComponentName = ({ prop1, prop2 }) => {
  // 3. Hooks
  const [state, setState] = useState(initialValue);
  
  // 4. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// 6. Export
export default ComponentName;
```

## 📝 Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Commit Format

```
type(scope): description

[optional body]

[optional footer]
```

### Examples

```bash
feat(player): add player statistics tracking
fix(match): resolve court assignment bug
docs(readme): update installation instructions
test(utils): add tests for generateId function
```

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for solutions
3. **Try to reproduce** the issue consistently

### Issue Template

Use the provided [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and fill it out completely.

### Required Information

- **Clear description** of the problem
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (OS, browser, version)
- **Screenshots** if applicable

## 💡 Feature Requests

### Before Requesting

1. **Check existing issues** for similar requests
2. **Consider the scope** and complexity
3. **Think about use cases** and benefits

### Feature Request Template

Use the provided [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and provide as much detail as possible.

## 💬 Questions and Discussion

### Getting Help

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bugs and feature requests
- **Pull Requests**: For code reviews and feedback

### Best Practices

- **Be respectful** and constructive
- **Provide context** for your questions
- **Search existing discussions** first
- **Use clear language** and examples

## 🏆 Recognition

### Contributors

All contributors are recognized in our [README.md](README.md) and [CHANGELOG.md](CHANGELOG.md).

### Types of Contributions

- **Code**: Bug fixes, features, improvements
- **Documentation**: README, guides, examples
- **Testing**: Test cases, bug reports
- **Design**: UI/UX improvements, accessibility
- **Community**: Helping others, spreading the word

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles)

## 🙏 Thank You

Thank you for contributing to the Badminton Pairing App! Your contributions help make this project better for everyone.

---

**Happy Contributing! 🏸** 