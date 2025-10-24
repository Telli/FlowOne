"""Force cleanup of duplicate templates by directly manipulating the database."""
import sys
import os

# Change to backend directory FIRST
original_dir = os.getcwd()
os.chdir(os.path.join(original_dir, 'backend'))
sys.path.insert(0, os.getcwd())

from memory.store import get_engine, Template, create_db
from sqlmodel import Session, select, delete

def force_cleanup():
    """Remove ALL templates with duplicate keys, keeping only one of each."""
    engine = get_engine()
    create_db(engine)
    print(f"📁 Using database: {engine.url}")
    
    with Session(engine) as session:
        # Get all templates
        all_templates = list(session.exec(select(Template)).all())
        
        print(f"📊 Total templates before cleanup: {len(all_templates)}")
        
        # Group by key
        templates_by_key = {}
        for template in all_templates:
            if template.key not in templates_by_key:
                templates_by_key[template.key] = []
            templates_by_key[template.key].append(template)
        
        # Delete duplicates
        deleted_count = 0
        for key, templates in templates_by_key.items():
            if len(templates) > 1:
                print(f"\n🔍 Key '{key}' has {len(templates)} templates")
                # Keep the first one, delete the rest
                for i, template in enumerate(templates):
                    if i == 0:
                        print(f"  ✅ KEEPING: {template.id} - {template.name}")
                    else:
                        print(f"  ❌ DELETING: {template.id} - {template.name}")
                        session.delete(template)
                        deleted_count += 1
        
        if deleted_count > 0:
            session.commit()
            print(f"\n✅ Deleted {deleted_count} duplicate templates")
        else:
            print("\n✅ No duplicates found!")
        
        # Show final state
        remaining = list(session.exec(select(Template)).all())
        print(f"\n📊 Total templates after cleanup: {len(remaining)}")
        for template in remaining:
            print(f"  - {template.key}: {template.name} (ID: {template.id})")

if __name__ == "__main__":
    force_cleanup()

