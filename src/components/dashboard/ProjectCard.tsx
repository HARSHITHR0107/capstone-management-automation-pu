import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/user';

interface ProjectCardProps {
    project: Project;
    isSelected: boolean;
    onSelect: (projectId: string) => void;
    onSubmit: () => void;
    teamCapacity: any;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    isSelected,
    onSelect,
    onSubmit,
    teamCapacity
}) => {
    return (
        <div className="space-y-3 min-w-0">
            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0">
                    <div className="flex-1 min-w-0 w-full pr-0 md:pr-4">
                        <h3 className="font-semibold break-words">{project.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{project.description}</p>
                        <Badge className="mt-2">{project.specialization}</Badge>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => onSelect(project.id)}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full md:w-auto shrink-0"
                    >
                        {isSelected ? "Selected" : "Select"}
                    </Button>
                </div>
            </div>

            {isSelected && (
                <div className="space-y-2 pl-4 pr-4">
                    <Button
                        onClick={onSubmit}
                        className="w-full"
                        size="lg"
                    >
                        Submit Project Selection
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        {teamCapacity?.isFull
                            ? 'All 4 team members must submit the same project to proceed with faculty assignment.'
                            : 'Your selection will be saved. Once your team is full, all members must select the same project.'}
                    </p>
                </div>
            )}
        </div>
    );
};
