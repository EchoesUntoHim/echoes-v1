# Security Specification for Echoes Unto Him

## 1. Data Invariants
- A track must have a valid title, author, and URL pointing to Firebase Storage.
- A blog post must have a title, content, and valid author ID.
- User roles (admin/user) are immutable for the user themselves. Only existing admins can promote others (though for this app, we'll bootstrap an admin).
- Timestamps must be server-generated.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to create a track with another user's `uid`.
2. **Role Escalation**: Attempt to set `role: 'admin'` during user profile creation.
3. **Shadow Field Injection**: Attempt to add `isFamous: true` to a track document.
4. **Large Payload Attack**: Attempt to save a 5MB base64 string in the `url` field instead of a storage link.
5. **ID Poisoning**: Use a 2KB string of junk characters as a `trackId`.
6. **Timeline Fraud**: Attempt to set `createdAt` to a date in 1999.
7. **Malicious Link**: Set `url` to `javascript:alert('xss')`.
8. **Unverified Email**: Access private data without a verified email.
9. **Terminal State Bypass**: Attempt to edit a track after it was marked as "published" (if applicable).
10. **Data Scraping**: Attempting to list all tracks without being the owner or an admin.
11. **PII Leak**: Attempting to read another user's email directly from their profile.
12. **Orphaned Write**: Create an arranged track referencing a user ID that doesn't exist in the `users` collection.

## 3. Test Runner (Conceptual Plan)
I would use `@firebase/rules-unit-testing` to verify these payloads.
- `firebase.assertSucceeds(ownerWrite)`
- `firebase.assertFails(maliciousWrite)`
- `firebase.assertFails(unauthenticatedRead)`
