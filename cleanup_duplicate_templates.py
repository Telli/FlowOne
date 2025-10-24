"""Clean up duplicate templates from the database."""
import sys
sys.path.insert(0, 'backend')

from memory.store import get_engine, Template, create_db
from sqlmodel import Session, select

def cleanup_duplicates():
    """Remove duplicate templates, keeping only the first occurrence of each key."""
    engine = get_engine()
    create_db(engine)  # Ensure tables exist

    with Session(engine) as session:
        # Get all templates - force fresh query
        all_templates = list(session.exec(select(Template)).all())

        print(f"📊 Total templates in database: {len(all_templates)}")
        
        # Group by key
        templates_by_key = {}
        for template in all_templates:
            if template.key not in templates_by_key:
                templates_by_key[template.key] = []
            templates_by_key[template.key].append(template)
        
        # Find duplicates
        duplicates_to_delete = []
        for key, templates in templates_by_key.items():
            if len(templates) > 1:
                print(f"\n🔍 Found {len(templates)} templates with key '{key}':")
                # Keep the first one, delete the rest
                for i, template in enumerate(templates):
                    if i == 0:
                        print(f"  ✅ KEEPING: {template.id} - {template.name}")
                    else:
                        print(f"  ❌ DELETING: {template.id} - {template.name}")
                        duplicates_to_delete.append(template)
        
        if not duplicates_to_delete:
            print("\n✅ No duplicates found!")
            return
        
        print(f"\n🗑️  Deleting {len(duplicates_to_delete)} duplicate templates...")
        
        for template in duplicates_to_delete:
            session.delete(template)
        
        session.commit()
        
        print(f"✅ Cleanup complete! Deleted {len(duplicates_to_delete)} duplicates.")
        
        # Show final count
        remaining = session.exec(select(Template)).all()
        print(f"📊 Remaining templates: {len(remaining)}")
        for template in remaining:
            print(f"  - {template.key}: {template.name}")

if __name__ == "__main__":
    cleanup_duplicates()

