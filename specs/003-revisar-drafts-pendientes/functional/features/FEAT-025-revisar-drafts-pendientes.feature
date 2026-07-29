Feature: Review Pending Drafts
  The user resolves CardStatementDrafts that need attention from the
  Import Center, without having to navigate to the Cards section first.

  Background:
    Given the user is on the Import Center

  Scenario: The pending drafts panel lists preview_ready and failed drafts
    Given a CardStatementDraft with status "preview_ready" exists
    And a CardStatementDraft with status "failed" exists
    When the user opens the pending drafts panel
    Then the panel lists both drafts
    And each draft shows its current status

  Scenario: Accepting a preview_ready draft creates a CardStatement
    Given a CardStatementDraft with status "preview_ready" exists
    When the user accepts the draft from the pending drafts panel
    Then a CardStatement is created with the same data as the draft
    And the draft no longer appears in the pending drafts panel

  Scenario: Viewing a preview_ready draft opens it in the Cards section
    Given a CardStatementDraft with status "preview_ready" exists
    When the user views the draft from the pending drafts panel
    Then the Cards section opens with the draft preview loaded
    And the preview is in editable mode

  Scenario: Requesting to discard a preview_ready draft shows a confirmation modal
    Given a CardStatementDraft with status "preview_ready" exists
    When the user requests to discard the draft
    Then a confirmation modal appears describing the action

  Scenario: Confirming the discard deletes the draft and its document
    Given a CardStatementDraft with status "preview_ready" exists
    And a confirmation modal is open for the draft
    When the user confirms the discard
    Then the draft is deleted
    And the associated UploadedDocument is deleted
    And the draft no longer appears in the pending drafts panel

  Scenario: A failed draft shows the error reason and offers a discard action
    Given a CardStatementDraft with status "failed" exists
    And the draft has an error reason
    When the user opens the pending drafts panel
    Then the draft appears with its error reason visible
    And the draft offers a Discard action
