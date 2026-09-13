Feature: Import card statement from PDF
  Upload a card PDF, review the AI-extracted editable preview, and accept it into the ledger.

  Background:
    Given the user is on the importaciones section

  Scenario: Upload PDF creates a draft for review
    When the user uploads a card statement PDF
    Then a draft import is created in processing state
    And the draft becomes ready for preview once extraction finishes

  Scenario: Edit preview rows before accepting
    Given a draft import ready for preview
    When the user edits the preview rows
    Then the draft reflects the edited values

  Scenario: Accept draft materializes the statement
    Given a draft import ready for preview
    When the user accepts the draft
    Then an accepted card statement exists with its sections, groups and rows
    And installment projections are generated for installment purchases

  Scenario: Re-uploading the same PDF is rejected as duplicate
    Given a PDF that was already imported
    When the user uploads the same PDF again
    Then the upload is rejected as a duplicate
